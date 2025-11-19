export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'getHistory':
        return this.getHistory();
      case 'addMessage':
        return this.addMessage(await request.json());
      case 'clearHistory':
        return this.clearHistory();
      case 'updatePreferences':
        return this.updatePreferences(await request.json());
      case 'addCostEntry':
        return this.addCostEntry(await request.json());
      case 'incrementSession':
        return this.incrementSession();
      case 'logError':
        return this.logError(await request.json());
      default:
        return new Response('Unknown action', { status: 400 });
    }
  }

  async getHistory() {
    try {
      let messages = (await this.state.storage.get('messages')) || [];
      if (!Array.isArray(messages)) {
        messages = [];
        await this.state.storage.put('messages', []);
      }
      
      if (messages.length > 100) {
        messages = messages.slice(-100);
        await this.state.storage.put('messages', messages);
      }
      
      const userData = (await this.state.storage.get('userData')) || { preferences: {}, sessionCount: 0 };
      const analytics = (await this.state.storage.get('analytics')) || { totalMessages: 0, tokensUsed: 0 };
      let costTracking = (await this.state.storage.get('costTracking')) || { totalCost: 0, entries: [] };
      
      if (!Array.isArray(costTracking.entries)) {
        costTracking.entries = [];
      }
      
      if (costTracking.entries && costTracking.entries.length > 100) {
        costTracking.entries = costTracking.entries.slice(-100);
        await this.state.storage.put('costTracking', costTracking);
      }

      return new Response(JSON.stringify({ messages, userData, analytics, costTracking }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Error in getHistory:', e);
      return new Response(JSON.stringify({ 
        messages: [], 
        userData: { preferences: {}, sessionCount: 0 }, 
        analytics: { totalMessages: 0, tokensUsed: 0 }, 
        costTracking: { totalCost: 0, entries: [] } 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async addMessage(data) {
    try {
      const messages = (await this.state.storage.get('messages')) || [];
      if (!Array.isArray(messages)) {
        console.error('Messages is not an array, resetting to []');
        await this.state.storage.put('messages', []);
        return this.addMessage(data);
      }
      
      messages.push(data);
      await this.state.storage.put('messages', messages);

      const analytics = (await this.state.storage.get('analytics')) || { totalMessages: 0, tokensUsed: 0 };
      analytics.totalMessages = messages.length;
      if (data.tokensUsed) {
        analytics.tokensUsed = (analytics.tokensUsed || 0) + data.tokensUsed;
      }
      await this.state.storage.put('analytics', analytics);

      return new Response(JSON.stringify({ success: true, analytics }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Error in addMessage:', e);
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async clearHistory() {
    await this.state.storage.put('messages', []);
    await this.state.storage.put('analytics', { totalMessages: 0, tokensUsed: 0 });
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async updatePreferences(prefs) {
    const userData = (await this.state.storage.get('userData')) || { preferences: {}, sessionCount: 0 };
    userData.preferences = { ...userData.preferences, ...prefs };
    await this.state.storage.put('userData', userData);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async addCostEntry(entry) {
    try {
      const costTracking = (await this.state.storage.get('costTracking')) || { totalCost: 0, entries: [] };
      if (!costTracking.entries || !Array.isArray(costTracking.entries)) {
        costTracking.entries = [];
      }
      costTracking.entries.push(entry);
      costTracking.totalCost = (costTracking.totalCost || 0) + entry.cost;
      await this.state.storage.put('costTracking', costTracking);
      return new Response(JSON.stringify({ success: true, costTracking }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Error in addCostEntry:', e);
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async incrementSession() {
    const userData = (await this.state.storage.get('userData')) || { preferences: {}, sessionCount: 0 };
    userData.sessionCount = (userData.sessionCount || 0) + 1;
    await this.state.storage.put('userData', userData);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async logError(errorData) {
    try {
      const errorLog = (await this.state.storage.get('errorLog')) || [];
      if (!Array.isArray(errorLog)) {
        console.error('Error log is not an array, resetting');
        await this.state.storage.put('errorLog', []);
        return this.logError(errorData);
      }
      errorLog.push({ ...errorData, timestamp: Date.now() });
      await this.state.storage.put('errorLog', errorLog.slice(-100));
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Error in logError:', e);
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

