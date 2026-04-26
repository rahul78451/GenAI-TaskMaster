// ====== PROJECT PLANNER COMPONENT ======
function ProjectPlanner({ refreshTrigger, onRefresh }) {
    const [goalInput, setGoalInput] = useState('');
    const [projects, setProjects] = useState(() => { try { return JSON.parse(localStorage.getItem('tm_projects') || '[]'); } catch(e) { return []; } });
    const [activeProject, setActiveProject] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [kanbanView, setKanbanView] = useState('kanban');
    const [aiSuggestions, setAiSuggestions] = useState([]);

    const saveProjects = (list) => { setProjects(list); localStorage.setItem('tm_projects', JSON.stringify(list)); };

    const generatePlan = () => {
        if (!goalInput.trim()) return;
        setGenerating(true);
        fetch('http://localhost:8080/api/ai-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Create a detailed project plan for: "' + goalInput + '". Return ONLY a JSON array of tasks like: [{"title":"task name","priority":"high/medium/low","week":1,"duration":1,"status":"todo"}]. Return 6-10 tasks. JSON only, no other text.' })
        }).then(r => r.json()).then(data => {
            let tasks = [];
            try {
                const text = data.assistant_response || '[]';
                const match = text.match(/\[[\s\S]*\]/);
                if (match) tasks = JSON.parse(match[0]);
            } catch(e) { tasks = [
                { title: 'Research & Planning', priority: 'high', week: 1, duration: 1, status: 'todo' },
                { title: 'Design & Prototyping', priority: 'high', week: 2, duration: 1, status: 'todo' },
                { title: 'Core Development', priority: 'high', week: 3, duration: 2, status: 'todo' },
                { title: 'Testing & QA', priority: 'medium', week: 5, duration: 1, status: 'todo' },
                { title: 'Launch & Deploy', priority: 'medium', week: 6, duration: 1, status: 'todo' }
            ]; }
            const project = { id: Date.now(), goal: goalInput, tasks: tasks.map((t,i) => ({ ...t, id: i+1 })), createdAt: new Date().toISOString() };
            const updated = [...projects, project];
            saveProjects(updated);
            setActiveProject(project);
            setGoalInput('');
            setGenerating(false);
            generateSuggestions(goalInput);
        }).catch(() => {
            const fallback = { id: Date.now(), goal: goalInput, tasks: [
                { id:1, title: 'Research & Analysis', priority: 'high', week: 1, duration: 1, status: 'todo' },
                { id:2, title: 'Design Phase', priority: 'high', week: 2, duration: 1, status: 'todo' },
                { id:3, title: 'Development Sprint 1', priority: 'high', week: 3, duration: 2, status: 'todo' },
                { id:4, title: 'Development Sprint 2', priority: 'medium', week: 4, duration: 2, status: 'todo' },
                { id:5, title: 'Testing & QA', priority: 'medium', week: 5, duration: 1, status: 'todo' },
                { id:6, title: 'Deployment & Launch', priority: 'low', week: 6, duration: 1, status: 'todo' }
            ], createdAt: new Date().toISOString() };
            saveProjects([...projects, fallback]);
            setActiveProject(fallback);
            setGoalInput('');
            setGenerating(false);
        });
    };

    const generateSuggestions = (goal) => {
        fetch('http://localhost:8080/api/ai-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Give 5 short optimization tips for this project: "' + goal + '". Each tip should be one line.' })
        }).then(r => r.json()).then(data => {
            const text = data.assistant_response || '';
            setAiSuggestions(text.split('\n').filter(l => l.trim()).slice(0, 5));
        }).catch(() => setAiSuggestions(['Focus on MVP first', 'Set weekly milestones', 'Prioritize user feedback']));
    };

    const updateTaskStatus = (taskId, newStatus) => {
        if (!activeProject) return;
        const updated = { ...activeProject, tasks: activeProject.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t) };
        setActiveProject(updated);
        saveProjects(projects.map(p => p.id === updated.id ? updated : p));
    };

    const deleteProject = (id) => { const updated = projects.filter(p => p.id !== id); saveProjects(updated); if (activeProject && activeProject.id === id) setActiveProject(null); };

    const progress = activeProject ? (() => { const done = activeProject.tasks.filter(t => t.status === 'done').length; return activeProject.tasks.length ? Math.round((done / activeProject.tasks.length) * 100) : 0; })() : 0;
    const priColor = (p) => p === 'high' ? '#f87171' : p === 'low' ? '#34d399' : '#fbbf24';
    const statusCols = ['todo', 'in_progress', 'done'];
    const statusLabels = { todo: '📋 To Do', in_progress: '🔄 In Progress', done: '✅ Done' };
    const maxWeek = activeProject ? Math.max(...activeProject.tasks.map(t => (t.week || 1) + (t.duration || 1) - 1), 6) : 6;

    return React.createElement('div', { className: 'container' },
        // Header
        React.createElement('div', { style: { marginBottom: '24px' } },
            React.createElement('h2', { style: { margin: '0 0 6px', color: '#1a1a2e', fontSize: '24px', fontWeight: '700' } }, '📋 Project Planner'),
            React.createElement('p', { style: { margin: 0, color: '#6b6b80', fontSize: '13px' } }, 'AI-powered project planning — Enter a goal and get an instant plan')
        ),
        // Goal Input
        React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '24px' } },
            React.createElement('input', { type: 'text', value: goalInput, onChange: e => setGoalInput(e.target.value), onKeyDown: e => e.key === 'Enter' && generatePlan(), placeholder: '🎯 Enter your project goal... (e.g., "Launch a SaaS product")', style: { flex: 1, padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)', backgroundColor: 'rgba(20,20,32,0.75)', color: '#f0f0f5', fontSize: '14px', fontFamily: 'inherit' } }),
            React.createElement('button', { onClick: generatePlan, disabled: generating || !goalInput.trim(), style: { padding: '14px 24px', background: generating ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', cursor: generating ? 'wait' : 'pointer', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap' } }, generating ? '⟳ Generating...' : '🚀 Generate Plan')
        ),
        // Project List
        projects.length > 0 && !activeProject && React.createElement('div', { style: { marginBottom: '24px' } },
            React.createElement('h3', { style: { margin: '0 0 14px', color: '#1a1a2e', fontSize: '15px', fontWeight: '700' } }, '📂 My Projects (' + projects.length + ')'),
            projects.map(p => React.createElement('div', { key: p.id, onClick: () => { setActiveProject(p); generateSuggestions(p.goal); }, style: { padding: '16px', marginBottom: '10px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, onMouseEnter: e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }, onMouseLeave: e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; } },
                React.createElement('div', null,
                    React.createElement('h4', { style: { margin: '0 0 4px', color: '#f0f0f5', fontSize: '14px' } }, '🎯 ' + p.goal),
                    React.createElement('p', { style: { margin: 0, color: '#6b6b80', fontSize: '11px' } }, p.tasks.length + ' tasks • ' + new Date(p.createdAt).toLocaleDateString())
                ),
                React.createElement('div', { style: { display: 'flex', gap: '6px' } },
                    React.createElement('span', { style: { padding: '4px 10px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '6px', fontSize: '11px' } }, p.tasks.filter(t=>t.status==='done').length + '/' + p.tasks.length + ' done'),
                    React.createElement('button', { onClick: (e) => { e.stopPropagation(); deleteProject(p.id); }, style: { padding: '4px 8px', backgroundColor: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' } }, '✕')
                )
            ))
        ),
        // Active Project View
        activeProject && React.createElement('div', null,
            // Back button + Progress
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                    React.createElement('button', { onClick: () => setActiveProject(null), style: { padding: '6px 14px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#a0a0b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' } }, '← Back'),
                    React.createElement('h3', { style: { margin: 0, color: '#f0f0f5', fontSize: '16px' } }, '🎯 ' + activeProject.goal)
                ),
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                    React.createElement('div', { style: { width: '150px', height: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' } },
                        React.createElement('div', { style: { width: progress + '%', height: '100%', background: progress >= 80 ? '#34d399' : progress >= 40 ? '#fbbf24' : '#6366f1', borderRadius: '4px', transition: 'width 0.5s' } })
                    ),
                    React.createElement('span', { style: { color: progress >= 80 ? '#34d399' : '#a0a0b8', fontSize: '13px', fontWeight: '700' } }, progress + '%')
                )
            ),
            // View Toggle
            React.createElement('div', { style: { display: 'flex', gap: '4px', marginBottom: '20px', padding: '4px', backgroundColor: 'rgba(20,20,32,0.6)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' } },
                ['kanban', 'timeline', 'list'].map(v => React.createElement('button', { key: v, onClick: () => setKanbanView(v), style: { flex: 1, padding: '8px', backgroundColor: kanbanView === v ? 'rgba(99,102,241,0.15)' : 'transparent', border: kanbanView === v ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent', borderRadius: '8px', color: kanbanView === v ? '#818cf8' : '#6b6b80', fontSize: '12px', fontWeight: '600', cursor: 'pointer' } }, v === 'kanban' ? '📊 Kanban' : v === 'timeline' ? '📅 Timeline' : '📋 List'))
            ),
            // KANBAN VIEW
            kanbanView === 'kanban' && React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' } },
                statusCols.map(status => React.createElement('div', { key: status, style: { padding: '16px', backgroundColor: 'rgba(20,20,32,0.6)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', minHeight: '200px' } },
                    React.createElement('h4', { style: { margin: '0 0 14px', color: '#a0a0b8', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' } }, statusLabels[status], React.createElement('span', { style: { backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' } }, activeProject.tasks.filter(t => (t.status||'todo') === status).length)),
                    activeProject.tasks.filter(t => (t.status||'todo') === status).map(task => React.createElement('div', { key: task.id, style: { padding: '12px', marginBottom: '8px', backgroundColor: 'rgba(20,20,32,0.85)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid ' + priColor(task.priority) } },
                        React.createElement('p', { style: { margin: '0 0 8px', color: '#f0f0f5', fontSize: '13px', fontWeight: '500' } }, task.title),
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                            React.createElement('span', { style: { padding: '2px 8px', backgroundColor: priColor(task.priority) + '18', color: priColor(task.priority), borderRadius: '6px', fontSize: '10px', fontWeight: '600' } }, task.priority),
                            React.createElement('select', { value: task.status || 'todo', onChange: e => updateTaskStatus(task.id, e.target.value), style: { padding: '3px 6px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#a0a0b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' } },
                                React.createElement('option', { value: 'todo' }, 'To Do'),
                                React.createElement('option', { value: 'in_progress' }, 'In Progress'),
                                React.createElement('option', { value: 'done' }, 'Done')
                            )
                        )
                    ))
                ))
            ),
            // TIMELINE VIEW
            kanbanView === 'timeline' && React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px', overflowX: 'auto' } },
                React.createElement('div', { style: { display: 'flex', marginBottom: '10px', paddingLeft: '140px' } },
                    Array.from({ length: maxWeek }, (_, i) => React.createElement('div', { key: i, style: { flex: '0 0 80px', textAlign: 'center', color: '#6b6b80', fontSize: '11px', fontWeight: '600' } }, 'Week ' + (i + 1)))
                ),
                activeProject.tasks.map(task => React.createElement('div', { key: task.id, style: { display: 'flex', alignItems: 'center', marginBottom: '6px', height: '32px' } },
                    React.createElement('div', { style: { width: '140px', flexShrink: 0, fontSize: '12px', color: '#a0a0b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' } }, task.title),
                    React.createElement('div', { style: { flex: 1, position: 'relative', height: '24px', display: 'flex' } },
                        Array.from({ length: maxWeek }, (_, i) => React.createElement('div', { key: i, style: { flex: '0 0 80px', borderLeft: '1px solid rgba(255,255,255,0.04)' } })),
                        React.createElement('div', { style: { position: 'absolute', left: ((task.week || 1) - 1) * 80 + 'px', width: (task.duration || 1) * 80 - 8 + 'px', height: '24px', background: 'linear-gradient(90deg, ' + priColor(task.priority) + '88, ' + priColor(task.priority) + '44)', borderRadius: '6px', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '10px', color: '#fff', fontWeight: '600' } }, task.title.substring(0, 15))
                    )
                ))
            ),
            // LIST VIEW
            kanbanView === 'list' && React.createElement('div', { style: { marginBottom: '24px' } },
                activeProject.tasks.map(task => React.createElement('div', { key: task.id, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', marginBottom: '6px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid ' + priColor(task.priority) } },
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 } },
                        React.createElement('input', { type: 'checkbox', checked: task.status === 'done', onChange: () => updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done'), style: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' } }),
                        React.createElement('span', { style: { color: task.status === 'done' ? '#6b6b80' : '#f0f0f5', fontSize: '13px', fontWeight: '500', textDecoration: task.status === 'done' ? 'line-through' : 'none' } }, task.title)
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                        React.createElement('span', { style: { padding: '3px 8px', backgroundColor: priColor(task.priority) + '18', color: priColor(task.priority), borderRadius: '6px', fontSize: '10px', fontWeight: '600' } }, task.priority),
                        React.createElement('span', { style: { color: '#6b6b80', fontSize: '11px' } }, 'W' + (task.week || 1)),
                        React.createElement('select', { value: task.status || 'todo', onChange: e => updateTaskStatus(task.id, e.target.value), style: { padding: '4px 8px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#a0a0b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' } },
                            React.createElement('option', { value: 'todo' }, 'To Do'),
                            React.createElement('option', { value: 'in_progress' }, 'In Progress'),
                            React.createElement('option', { value: 'done' }, 'Done')
                        )
                    )
                ))
            ),
            // AI Suggestions
            aiSuggestions.length > 0 && React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(99,102,241,0.06)', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.15)' } },
                React.createElement('h4', { style: { margin: '0 0 12px', color: '#818cf8', fontSize: '13px', fontWeight: '700' } }, '🤖 AI Suggestions'),
                aiSuggestions.map((s, i) => React.createElement('p', { key: i, style: { margin: '0 0 6px', padding: '8px 12px', backgroundColor: 'rgba(20,20,32,0.5)', borderRadius: '8px', borderLeft: '3px solid #818cf8', color: '#a0a0b8', fontSize: '12px' } }, s))
            )
        ),
        // Empty state
        projects.length === 0 && !activeProject && React.createElement('div', { style: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'rgba(20,20,32,0.5)', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.08)' } },
            React.createElement('p', { style: { fontSize: '48px', margin: '0 0 12px' } }, '📋'),
            React.createElement('h3', { style: { margin: '0 0 8px', color: '#f0f0f5', fontSize: '18px' } }, 'No Projects Yet'),
            React.createElement('p', { style: { color: '#6b6b80', fontSize: '13px' } }, 'Enter a goal above and click "Generate Plan" to get started!')
        )
    );
}
