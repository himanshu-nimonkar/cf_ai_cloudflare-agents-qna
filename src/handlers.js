import { withRetry, jsonResponse, errorResponse } from './utils.js';

export async function handleChat(request, env, userId) {
  try {
    const body = await request.json();
    const userMsg = body?.message;
    
    if (!userMsg || typeof userMsg !== 'string' || userMsg.trim().length === 0) {
      return errorResponse('Message is required', 400);
    }
    
    if (userMsg.length > 2000) {
      return errorResponse('Message too long. Maximum 2000 characters.', 400);
    }
    
    const id = env.CHAT_DO.idFromName(userId);
    const chatDO = env.CHAT_DO.get(id);
    
    let messages = [];
    try {
      const historyRes = await chatDO.fetch(new Request(`https://dummy.com?action=getHistory`));
      const historyData = await historyRes.json();
      messages = historyData.messages || [];
    } catch (doError) {
      console.error('Durable Object error (will retry):', doError.message);
      messages = [];
    }

    let ragContext = '';
    if (env.VECTORIZE) {
      try {
        const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: userMsg
        });
        const queryVector = embeddingResult.data[0];

        const vectorResults = await env.VECTORIZE.query(queryVector, { topK: 3 });
        
        if (vectorResults.matches && vectorResults.matches.length > 0) {
          const contexts = vectorResults.matches.map(m => m.metadata?.text || '');
          ragContext = `\n\nRELEVANT DOCUMENTATION:\n${contexts.join('\n\n')}`;
        }
      } catch (e) {
        console.error('RAG query failed:', e);
      }
    }

    const systemPrompt = {
      role: 'system',
      content: `You are a Cloudflare Agents Documentation Assistant. You ONLY answer questions about Cloudflare Agents SDK, based on the official documentation at https://developers.cloudflare.com/agents/

IMPORTANT RULES:
1. ONLY answer questions related to Cloudflare Agents SDK, Workers AI, Durable Objects, Workflows, MCP servers, and related Cloudflare platform features
2. If a question is NOT about Cloudflare Agents or related technologies, politely say: "I can only help with questions about Cloudflare Agents SDK. Please ask about Agents, Workers AI, Durable Objects, Workflows, or related Cloudflare platform features."
3. Reference documentation links when helpful: https://developers.cloudflare.com/agents/
4. Be clear, concise, and technical when appropriate
5. Help users understand how to build agents, use the SDK, and integrate with Cloudflare services
6. When documentation context is provided below, USE IT to give accurate, source-based answers with specific details

Topics you CAN help with:
- Building agents with the Agents SDK
- Agent class and API reference
- WebSockets and real-time communication
- State management and synchronization
- Workflows and scheduling
- Using AI models (Workers AI)
- MCP (Model Context Protocol) servers
- Vectorize, D1, and other Cloudflare integrations
- Deployment and configuration
- Examples and patterns

Topics you CANNOT help with:
- General programming questions unrelated to Cloudflare Agents
- Other chatbot frameworks
- Non-Cloudflare platforms
- General knowledge questions
- Math, history, entertainment, etc.${ragContext}`
    };

    const conversationHistory = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    const aiMessages = [
      systemPrompt,
      ...conversationHistory,
      { role: 'user', content: userMsg }
    ];

    let reply = 'I apologize, but I encountered an issue. Please try again.';
    let tokensUsed = 0;
    
    try {
      const aiResult = await withRetry(async () => {
        return await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: aiMessages,
          max_tokens: 1024,
          temperature: 0.7
        });
      }, 3, 2000);

      reply = aiResult?.response || reply;
      tokensUsed = aiResult?.tokensUsed || 0;
    } catch (aiError) {
      console.error('AI call failed after retries:', aiError);
      reply = 'I apologize, but I\'m temporarily unavailable. Please try again in a moment.';
      tokensUsed = 0;
    }
    const estimatedCost = (tokensUsed / 1000) * 0.002;

    await chatDO.fetch(new Request(`https://dummy.com?action=addMessage`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content: userMsg, timestamp: Date.now() })
    }));

    const addRes = await chatDO.fetch(new Request(`https://dummy.com?action=addMessage`, {
      method: 'POST',
      body: JSON.stringify({ role: 'assistant', content: reply, timestamp: Date.now(), tokensUsed })
    }));
    
    const { analytics } = await addRes.json();

    await chatDO.fetch(new Request(`https://dummy.com?action=addCostEntry`, {
      method: 'POST',
      body: JSON.stringify({
        timestamp: Date.now(),
        tokensUsed,
        cost: estimatedCost,
        model: 'llama-3.3-70b'
      })
    }));

    const costRes = await chatDO.fetch(new Request(`https://dummy.com?action=getHistory`));
    const { costTracking } = await costRes.json();

    return jsonResponse({ reply, analytics, costTracking });
  } catch (e) {
    console.error('Chat error:', e);
    console.error('Error stack:', e.stack);
    return errorResponse(`Chat processing failed: ${e.message}`);
  }
}

export async function handleHistory(env, userId) {
  try {
    const id = env.CHAT_DO.idFromName(userId);
    const chatDO = env.CHAT_DO.get(id);
    const res = await chatDO.fetch(new Request(`https://dummy.com?action=getHistory`));
    return res;
  } catch (e) {
    return errorResponse('Failed to fetch history');
  }
}

export async function handleExport(env, userId) {
  try {
    const id = env.CHAT_DO.idFromName(userId);
    const chatDO = env.CHAT_DO.get(id);
    const res = await chatDO.fetch(new Request(`https://dummy.com?action=getHistory`));
    const data = await res.json();
    
    return jsonResponse({
      exportedAt: new Date().toISOString(),
      ...data
    });
  } catch (e) {
    return errorResponse('Export failed');
  }
}

export async function handleClear(env, userId) {
  try {
    const id = env.CHAT_DO.idFromName(userId);
    const chatDO = env.CHAT_DO.get(id);
    await chatDO.fetch(new Request(`https://dummy.com?action=clearHistory`, { method: 'POST' }));
    return jsonResponse({ success: true });
  } catch (e) {
    return errorResponse('Clear failed');
  }
}

export async function handleSearch(request, env, userId) {
  try {
    const { query } = await request.json();
    const id = env.CHAT_DO.idFromName(userId);
    const chatDO = env.CHAT_DO.get(id);
    const res = await chatDO.fetch(new Request(`https://dummy.com?action=getHistory`));
    const { messages } = await res.json();
    
    const results = messages.filter(m =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );
    
    return jsonResponse({ results });
  } catch (e) {
    return errorResponse('Search failed');
  }
}

export async function handlePreferences(request, env, userId) {
  try {
    const prefs = await request.json();
    const id = env.CHAT_DO.idFromName(userId);
    const chatDO = env.CHAT_DO.get(id);
    await chatDO.fetch(new Request(`https://dummy.com?action=updatePreferences`, {
      method: 'POST',
      body: JSON.stringify(prefs)
    }));
    return jsonResponse({ success: true });
  } catch (e) {
    return errorResponse('Preferences update failed');
  }
}

export async function handleEmbedDocs(request, env) {
  try {
    const { chunks } = await request.json();
    
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return errorResponse('Invalid chunks data', 400);
    }

    const vectors = [];
    
    for (const chunk of chunks) {
      const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: chunk.text
      });
      
      vectors.push({
        id: chunk.id,
        values: embeddingResult.data[0],
        metadata: {
          text: chunk.text,
          url: chunk.url,
          title: chunk.title
        }
      });
    }

    await env.VECTORIZE.upsert(vectors);

    return jsonResponse({
      success: true,
      message: `Embedded and uploaded ${vectors.length} chunks to Vectorize`
    });
  } catch (e) {
    console.error('Embed docs error:', e);
    return errorResponse(`Embedding failed: ${e.message}`);
  }
}

export async function handleHealth(env) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 'operational',
      features: {
        chat: true,
        durableObjects: !!env.CHAT_DO,
        workersAI: !!env.AI,
        vectorize: !!env.VECTORIZE,
        rag: !!env.VECTORIZE,
        assets: !!env.ASSETS
      }
    };
    
    if (env.CHAT_DO) {
      try {
        const testId = env.CHAT_DO.idFromName('health-check');
        const testDO = env.CHAT_DO.get(testId);
        const testRes = await Promise.race([
          testDO.fetch(new Request('https://dummy.com?action=getHistory')),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        health.durableObjectsStatus = testRes.ok ? 'operational' : 'degraded';
      } catch (e) {
        health.durableObjectsStatus = 'degraded';
      }
    }
    
    return jsonResponse(health);
  } catch (e) {
    return jsonResponse({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, 500);
  }
}

