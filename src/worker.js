import { ChatRoom } from './chat-room.js';
import { verifyJwtHS256, extractToken } from './auth.js';
import { corsHeaders, jsonResponse, errorResponse } from './utils.js';
import {
  handleChat,
  handleHistory,
  handleExport,
  handleClear,
  handleSearch,
  handlePreferences,
  handleEmbedDocs,
  handleHealth
} from './handlers.js';

export { ChatRoom };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/api/embed-docs') {
      return await handleEmbedDocs(request, env);
    }

    if (url.pathname === '/api/health') {
      return await handleHealth(env);
    }

    const token = extractToken(request);
    const JWT_SECRET = env.JWT_SECRET || 'dev-secret-key-change-in-production';
    const claims = await verifyJwtHS256(token, JWT_SECRET);
    
    if (!claims || !claims.sub) {
      return errorResponse('Unauthorized', 401, origin);
    }

    const userId = String(claims.sub);

    const routes = {
      '/api/chat': () => handleChat(request, env, userId),
      '/api/history': () => handleHistory(env, userId),
      '/api/export': () => handleExport(env, userId),
      '/api/clear': () => handleClear(env, userId),
      '/api/search': () => handleSearch(request, env, userId),
      '/api/preferences': () => handlePreferences(request, env, userId)
    };

    const handler = routes[url.pathname];
    if (handler) {
      return await handler();
    }

    return env.ASSETS.fetch(request);
  }
};
