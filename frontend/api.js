class API {
      constructor(baseURL = "https://genai-backend-1013063132017.us-central1.run.app/api") {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Tasks
    getTasks(status = null) {
        const query = status ? `?status=${status}` : '';
        return this.request(`/tasks${query}`);
    }

    createTask(title, description = '', priority = 'medium') {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify({ title, description, priority }),
        });
    }

    updateTask(taskId, updates) {
        return this.request(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    deleteTask(taskId) {
        return this.request(`/tasks/${taskId}`, { method: 'DELETE' });
    }

    // Schedule
    getSchedule() {
        return this.request('/schedule');
    }

    createScheduleEvent(title, startTime, endTime, location = null) {
        return this.request('/schedule', {
            method: 'POST',
            body: JSON.stringify({
                title,
                start_time: startTime,
                end_time: endTime,
                location,
            }),
        });
    }

    deleteScheduleEvent(eventId) {
        return this.request(`/schedule/${eventId}`, { method: 'DELETE' });
    }

    // Notes
    getNotes() {
        return this.request('/notes');
    }

    createNote(title, content) {
        return this.request('/notes', {
            method: 'POST',
            body: JSON.stringify({ title, content }),
        });
    }

    updateNote(noteId, title, content) {
        return this.request(`/notes/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify({ title, content }),
        });
    }

    deleteNote(noteId) {
        return this.request(`/notes/${noteId}`, { method: 'DELETE' });
    }

    // Workflow
    executeWorkflow(request) {
        return this.request('/workflow', {
            method: 'POST',
            body: JSON.stringify({ request }),
        });
    }

    getWorkflowHistory() {
        return this.request('/workflow/history/all');
    }

    // Dashboard
    getDashboard() {
        return this.request('/dashboard/summary');
    }

    getAgentsStatus() {
        return this.request('/agents/status');
    }

    getAvailableTools() {
        return this.request('/tools/available');
    }
}

const API_CLIENT = new API();
