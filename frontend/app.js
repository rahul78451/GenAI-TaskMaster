const { useState, useEffect } = React;

// DASHBOARD COMPONENT
function Dashboard({ refreshTrigger, onTabChange }) {
    const [stats, setStats] = useState({ 
        total_tasks: 0, 
        pending_tasks: 0, 
        completed_tasks: 0, 
        total_events: 0, 
        total_notes: 0 
    });
    const [topTasks, setTopTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium' });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    
    // Pomodoro Timer State
    const [timerActive, setTimerActive] = useState(false);
    const [timerMinutes, setTimerMinutes] = useState(25);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [focusMode, setFocusMode] = useState('pomodoro'); // 'pomodoro' or 'break'
    
    // Productivity Score
    const [dailyScore, setDailyScore] = useState(0);
    const [streak, setStreak] = useState(0);

    const loadDashboard = () => {
        console.log('Loading dashboard...');
        
        // Fetch tasks
        let taskStats = { total: 0, pending: 0, completed: 0, all: [] };
        let eventCount = 0;
        let noteCount = 0;
        
        Promise.all([
            fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks')
                .then(res => res.json())
                .then(data => {
                    const tasks = Array.isArray(data) ? data : [];
                    taskStats.total = tasks.length;
                    taskStats.pending = tasks.filter(t => t.status === 'pending').length;
                    taskStats.completed = tasks.filter(t => t.status === 'completed').length;
                    taskStats.all = tasks;
                    
                    // Get top 3 priority tasks
                    const priorityOrder = { high: 1, medium: 2, low: 3 };
                    const sorted = tasks
                        .filter(t => t.status === 'pending')
                        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
                        .slice(0, 3);
                    setTopTasks(sorted);
                    
                    // Calculate productivity score
                    const today = new Date().toDateString();
                    const completedToday = tasks.filter(t => {
                        if (!t.updated_at) return false;
                        return new Date(t.updated_at).toDateString() === today && t.status === 'completed';
                    }).length;
                    setDailyScore(Math.min(100, completedToday * 15 + Math.random() * 20));
                })
                .catch(err => console.error('Error loading tasks:', err)),
            
            fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/schedule')
                .then(res => res.json())
                .then(data => {
                    eventCount = Array.isArray(data) ? data.length : 0;
                })
                .catch(err => console.error('Error loading schedule:', err)),
            
            fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/notes')
                .then(res => res.json())
                .then(data => {
                    noteCount = Array.isArray(data) ? data.length : 0;
                })
                .catch(err => console.error('Error loading notes:', err))
        ])
        .then(() => {
            setStats({
                total_tasks: taskStats.total,
                pending_tasks: taskStats.pending,
                completed_tasks: taskStats.completed,
                total_events: eventCount,
                total_notes: noteCount
            });
            setLoading(false);
        });
    };
    
    // Pomodoro Timer Effect
    useEffect(() => {
        let interval;
        if (timerActive) {
            interval = setInterval(() => {
                if (timerSeconds === 0) {
                    if (timerMinutes === 0) {
                        // Timer done - play a sound and switch modes
                        setFocusMode(focusMode === 'pomodoro' ? 'break' : 'pomodoro');
                        setTimerMinutes(focusMode === 'pomodoro' ? 5 : 25);
                        setTimerSeconds(0);
                    } else {
                        setTimerMinutes(timerMinutes - 1);
                        setTimerSeconds(59);
                    }
                } else {
                    setTimerSeconds(timerSeconds - 1);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive, timerMinutes, timerSeconds, focusMode]);

    useEffect(() => {
        console.log('Dashboard useEffect triggered, refreshTrigger:', refreshTrigger);
        loadDashboard();
    }, [refreshTrigger]);

    const performSearch = (query) => {
        if (!query.trim()) {
            setShowSearchResults(false);
            setSearchResults([]);
            return;
        }

        const searchLower = query.toLowerCase();
        const results = [];

        // Search Tasks
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks')
            .then(res => res.json())
            .then(tasks => {
                const matchedTasks = (tasks || []).filter(task => 
                    task.title.toLowerCase().includes(searchLower) || 
                    (task.description && task.description.toLowerCase().includes(searchLower))
                );
                
                matchedTasks.forEach(task => {
                    results.push({
                        type: 'Task',
                        icon: '✓',
                        title: task.title,
                        description: task.description,
                        status: task.status,
                        priority: task.priority
                    });
                });

                setSearchResults(results);
                setShowSearchResults(true);
            })
            .catch(err => console.error('Error searching tasks:', err));
    };

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        performSearch(query);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setShowSearchResults(false);
        setSearchResults([]);
    };

    const createTestTask = () => {
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Complete Project Documentation',
                description: 'Write comprehensive documentation for the AI Task Manager system',
                priority: 'high'
            })
        })
        .then(res => res.json())
        .then(data => {
            console.log('Task created:', data);
            setTimeout(loadDashboard, 500);
            alert('✓ Test task created! Check the Tasks tab.');
        })
        .catch(err => console.error('Error creating task:', err));
    };

    const handleCreateTask = () => {
        if (!formData.title.trim()) {
            alert('Please enter a task title');
            return;
        }

        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: formData.title,
                description: formData.description,
                priority: formData.priority
            })
        })
        .then(res => res.json())
        .then(data => {
            loadDashboard();
            setShowCreateForm(false);
            setFormData({ title: '', description: '', priority: 'medium' });
            alert('✓ Task created successfully!');
        })
        .catch(err => {
            console.error('Error creating task:', err);
            alert('Error creating task');
        });
    };

    if (loading) {
        return React.createElement('div', { className: 'container' }, 
            React.createElement('h2', null, '📊 Dashboard'),
            React.createElement('p', null, '⏳ Loading dashboard...'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' } },
                React.createElement('div', { style: { padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' } }, React.createElement('p', null, '📋 Total Tasks: 0')),
                React.createElement('div', { style: { padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' } }, React.createElement('p', null, '⏳ Pending: 0')),
                React.createElement('div', { style: { padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' } }, React.createElement('p', null, '✓ Completed: 0'))
            )
        );
    }

    const statCardStyle = {
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
    };

    const makeStatCard = (title, value, icon, color, onClick) => {
        return React.createElement('div', { 
            className: 'stat-card',
            onClick: onClick,
            onMouseEnter: (e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
            },
            style: { ...statCardStyle, borderLeft: `4px solid ${color}` }
        },
            React.createElement('div', null,
                React.createElement('span', { style: { fontSize: '28px', display: 'block', marginBottom: '8px' } }, icon),
                React.createElement('h3', { style: { margin: '0 0 8px 0', color: '#333', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' } }, title)
            ),
            React.createElement('p', { style: { margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: color } }, value || 0),
            React.createElement('p', { style: { margin: '0', fontSize: '11px', color: '#9ca3af', fontWeight: '500' } }, '▲ View details →')
        );
    };

    return React.createElement('div', { className: 'container' },
        React.createElement('div', { style: { marginBottom: '30px', padding: '16px', backgroundColor: '#fafbfc', borderRadius: '10px', border: '1px solid #e5e7eb' } },
            React.createElement('label', { style: { display: 'block', marginBottom: '12px', fontWeight: '600', color: '#1f2937', fontSize: '13px', letterSpacing: '0.5px' } }, '🔍 SEARCH EVERYTHING'),
            React.createElement('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
                React.createElement('input', {
                    type: 'text',
                    value: searchQuery,
                    onChange: handleSearchChange,
                    placeholder: 'Search tasks, schedule, notes, workflows...',
                    style: { flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'white' }
                }),
                searchQuery && React.createElement('button', {
                    onClick: clearSearch,
                    style: { padding: '8px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }
                }, '✕')
            )
        ),

        showSearchResults && React.createElement('div', { style: { marginBottom: '30px', padding: '20px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '2px solid #0ea5e9' } },
            React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#0369a1', fontSize: '15px', fontWeight: '600' } }, '🔍 Search Results (' + searchResults.length + ' found)'),
            searchResults.length === 0 ? React.createElement('p', { style: { margin: 0, color: '#666' } }, 'No results found for "' + searchQuery + '"') : null,
            searchResults.map((result, idx) => React.createElement('div', { key: idx, style: { backgroundColor: 'white', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #bfdbfe' } },
                React.createElement('div', { style: { display: 'flex', gap: '12px', alignItems: 'start' } },
                    React.createElement('span', { style: { fontSize: '20px', flexShrink: 0 } }, result.icon),
                    React.createElement('div', { style: { flex: 1 } },
                        React.createElement('h4', { style: { margin: '0 0 5px 0', color: '#1f2937', fontSize: '14px', fontWeight: '600' } }, result.type + ': ' + result.title),
                        result.description && React.createElement('p', { style: { margin: '0 0 8px 0', color: '#666', fontSize: '13px' } }, result.description),
                        React.createElement('div', { style: { display: 'flex', gap: '8px', fontSize: '11px' } },
                            result.status && React.createElement('span', { style: { backgroundColor: result.status === 'completed' ? '#d1fae5' : '#fef3c7', color: result.status === 'completed' ? '#065f46' : '#92400e', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' } }, result.status),
                            result.priority && React.createElement('span', { style: { backgroundColor: result.priority === 'high' ? '#fee2e2' : result.priority === 'medium' ? '#fef3c7' : '#dcfce7', color: result.priority === 'high' ? '#7f1d1d' : result.priority === 'medium' ? '#92400e' : '#166534', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' } }, result.priority)
                        )
                    )
                )
            ))
        ),

        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' } },
            React.createElement('div', null,
                React.createElement('h2', { style: { margin: '0 0 8px 0', color: '#1f2937', fontSize: '24px', fontWeight: '700' } }, '📊 Dashboard'),
                React.createElement('p', { style: { margin: '0', color: '#9ca3af', fontSize: '13px' } }, 'Overview of your productivity')
            ),
            React.createElement('button', {
                onClick: () => setShowCreateForm(true),
                style: {
                    padding: '10px 18px',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }
            }, '➕ New Task')
        ),
        React.createElement('div', { className: 'stats-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' } },
            makeStatCard('TOTAL TASKS', stats.total_tasks || 0, '📋', '#6366f1', () => onTabChange('Tasks', null)),
            makeStatCard('PENDING', stats.pending_tasks || 0, '⏳', '#f59e0b', () => onTabChange('Tasks', 'pending')),
            makeStatCard('COMPLETED', stats.completed_tasks || 0, '✓', '#10b981', () => onTabChange('Tasks', 'completed')),
            makeStatCard('CALENDAR EVENTS', stats.total_events || 0, '📅', '#8b5cf6', () => onTabChange('Schedule', null)),
            makeStatCard('NOTES', stats.total_notes || 0, '📝', '#06b6d4', () => onTabChange('Notes', null))
        ),
        
        // TODAY'S FOCUS SECTION
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' } },
            // Today's Focus (Left)
            React.createElement('div', { style: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } },
                React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#1f2937', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' } }, '🎯 TODAY\'s FOCUS'),
                topTasks.length === 0 ? 
                    React.createElement('p', { style: { margin: '0', color: '#9ca3af', fontSize: '13px' } }, 'No pending tasks for today. Great job!') :
                    React.createElement('div', null,
                        topTasks.map((task, idx) => React.createElement('div', { key: task.id, className: 'focus-item', style: { padding: '12px', background: 'linear-gradient(135deg, #667eea0a 0%, #764ba20a 100%)', borderLeft: '4px solid #667eea', borderRadius: '6px', marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center' } },
                            React.createElement('span', { className: 'focus-number', style: { fontWeight: '700', fontSize: '18px', color: '#667eea', lineHeight: '1', minWidth: '24px' } }, idx + 1),
                            React.createElement('div', { style: { flex: 1 } },
                                React.createElement('p', { style: { margin: '0 0 4px 0', color: '#1f2937', fontSize: '13px', fontWeight: '600' } }, task.title),
                                React.createElement('p', { style: { margin: '0', color: '#9ca3af', fontSize: '11px' } }, task.priority + ' priority')
                            )
                        ))
                    )
            ),
            
            // Pomodoro Timer (Right)
            React.createElement('div', { style: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } },
                React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#1f2937', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' } }, '⏱️ FOCUS TIMER'),
                React.createElement('div', { style: { textAlign: 'center' } },
                    React.createElement('div', { className: 'timer-display', style: { fontFamily: '\'Courier New\', monospace', fontSize: '48px', fontWeight: '700', textAlign: 'center', color: focusMode === 'pomodoro' ? '#ef4444' : '#10b981', margin: '20px 0', letterSpacing: '2px' } }, 
                        String(timerMinutes).padStart(2, '0') + ':' + String(timerSeconds).padStart(2, '0')
                    ),
                    React.createElement('p', { style: { margin: '0 0 15px 0', color: '#6b7280', fontSize: '12px', fontWeight: '600' } }, focusMode === 'pomodoro' ? 'Focus Time' : 'Break Time'),
                    React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center' } },
                        React.createElement('button', {
                            onClick: () => setTimerActive(!timerActive),
                            style: { padding: '10px 20px', backgroundColor: timerActive ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
                        }, timerActive ? '⏸️ Pause' : '▶️ Start'),
                        React.createElement('button', {
                            onClick: () => { setTimerActive(false); setTimerMinutes(25); setTimerSeconds(0); setFocusMode('pomodoro'); },
                            style: { padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
                        }, '⟲ Reset')
                    )
                )
            )
        ),
        
        // Productivity Score
        React.createElement('div', { style: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } },
            React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#1f2937', fontSize: '15px', fontWeight: '700' } }, '⭐ TODAY\'S PRODUCTIVITY'),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '20px' } },
                React.createElement('div', { style: { textAlign: 'center' } },
                    React.createElement('div', { style: { width: '80px', height: '80px', borderRadius: '50%', background: `conic-gradient(#10b981 0deg ${(dailyScore / 100) * 360}deg, #e5e7eb ${(dailyScore / 100) * 360}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                        React.createElement('div', { style: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' } },
                            React.createElement('div', { style: { fontSize: '24px', fontWeight: '700', color: '#10b981' } }, Math.round(dailyScore) + '%'),
                            React.createElement('div', { style: { fontSize: '10px', color: '#6b7280', marginTop: '4px' } }, 'Complete')
                        )
                    )
                ),
                React.createElement('div', { style: { flex: 1 } },
                    React.createElement('div', { style: { marginBottom: '12px' } },
                        React.createElement('p', { style: { margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: '#1f2937' } }, 'Tasks Completed: ' + stats.completed_tasks + '/' + stats.total_tasks),
                        React.createElement('div', { style: { width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' } },
                            React.createElement('div', { style: { width: (stats.total_tasks > 0 ? (stats.completed_tasks / stats.total_tasks * 100) : 0) + '%', height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s ease' } })
                        )
                    ),
                    React.createElement('p', { style: { margin: '0', fontSize: '12px', color: '#9ca3af' } }, '🔥 ' + streak + ' day streak - Keep it up!')
                )
            )
        ),

        React.createElement('div', { style: {
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#f0f4ff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
        }},
            React.createElement('h3', { style: { margin: '0 0 20px 0', color: '#1f2937', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' } }, '🎓 GETTING STARTED'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' } },
                React.createElement('div', { style: { padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' } },
                    React.createElement('span', { style: { fontSize: '18px', display: 'block', marginBottom: '6px' } }, '📝'),
                    React.createElement('strong', { style: { color: '#1f2937' } }, 'Create Tasks'),
                    React.createElement('p', { style: { margin: '6px 0 0 0', color: '#666' } }, 'Add tasks with title, description, and priority levels.')
                ),
                React.createElement('div', { style: { padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' } },
                    React.createElement('span', { style: { fontSize: '18px', display: 'block', marginBottom: '6px' } }, '📅'),
                    React.createElement('strong', { style: { color: '#1f2937' } }, 'Schedule Events'),
                    React.createElement('p', { style: { margin: '6px 0 0 0', color: '#666' } }, 'Plan your calendar and manage all your events.')
                ),
                React.createElement('div', { style: { padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' } },
                    React.createElement('span', { style: { fontSize: '18px', display: 'block', marginBottom: '6px' } }, '📝'),
                    React.createElement('strong', { style: { color: '#1f2937' } }, 'Take Notes'),
                    React.createElement('p', { style: { margin: '6px 0 0 0', color: '#666' } }, 'Capture ideas and important information.')
                ),
                React.createElement('div', { style: { padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' } },
                    React.createElement('span', { style: { fontSize: '18px', display: 'block', marginBottom: '6px' } }, '🤖'),
                    React.createElement('strong', { style: { color: '#1f2937' } }, 'Use AI Workflows'),
                    React.createElement('p', { style: { margin: '6px 0 0 0', color: '#666' } }, 'Automate complex tasks with AI.')
                )
            )
        ),

        showCreateForm && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 } },
            React.createElement('div', { style: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '30px', maxWidth: '500px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' } },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' } },
                    React.createElement('h2', { style: { margin: 0 } }, '✨ Create New Task'),
                    React.createElement('button', {
                        onClick: () => {
                            setShowCreateForm(false);
                            setFormData({ title: '', description: '', priority: 'medium' });
                        },
                        style: { backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '0', width: '30px', height: '30px' }
                    }, '✕')
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' } }, 'Task Title *'),
                    React.createElement('input', {
                        type: 'text',
                        value: formData.title,
                        onChange: (e) => setFormData({ ...formData, title: e.target.value }),
                        placeholder: 'What needs to be done?',
                        style: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                    })
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' } }, 'Description'),
                    React.createElement('textarea', {
                        value: formData.description,
                        onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                        placeholder: 'Add task details (optional)',
                        style: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }
                    })
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' } }, 'Priority'),
                    React.createElement('select', {
                        value: formData.priority,
                        onChange: (e) => setFormData({ ...formData, priority: e.target.value }),
                        style: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                    },
                        React.createElement('option', { value: 'low' }, '🟢 Low'),
                        React.createElement('option', { value: 'medium' }, '🟡 Medium'),
                        React.createElement('option', { value: 'high' }, '🔴 High')
                    )
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333', fontSize: '13px' } }, '💡 Quick Suggestions:'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '🏃 Morning Exercise', description: 'Do 30 mins of cardio or stretching', priority: 'high' }),
                            style: { padding: '8px 12px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '🏃 Morning Exercise'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '📧 Check Emails', description: 'Review and respond to important emails', priority: 'high' }),
                            style: { padding: '8px 12px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '📧 Check Emails'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '🛒 Grocery Shopping', description: 'Buy weekly groceries and essentials', priority: 'medium' }),
                            style: { padding: '8px 12px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '🛒 Shopping'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '👥 Team Meeting', description: 'Attend scheduled team standup', priority: 'high' }),
                            style: { padding: '8px 12px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '👥 Team Meeting'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '💰 Budget Review', description: 'Review monthly budget and spending', priority: 'medium' }),
                            style: { padding: '8px 12px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '💰 Budget'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '🧹 Clean Room', description: 'Organize and clean your workspace', priority: 'low' }),
                            style: { padding: '8px 12px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '🧹 Clean')
                    )
                ),

                React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                    React.createElement('button', {
                        onClick: () => {
                            setShowCreateForm(false);
                            setFormData({ title: '', description: '', priority: 'medium' });
                        },
                        style: { flex: 1, padding: '10px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }
                    }, 'Cancel'),
                    React.createElement('button', {
                        onClick: handleCreateTask,
                        style: { flex: 1, padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }
                    }, 'Create Task')
                )
            )
        )
    );
}

// ====== TASKS COMPONENT ======
function Tasks({ refreshTrigger, onRefresh, filterStatus }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeFilter, setActiveFilter] = useState(filterStatus || null);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedTasks, setExpandedTasks] = useState({});
    const [formData, setFormData] = useState({ 
        title: '', 
        description: '', 
        priority: 'medium',
        category: 'Personal',
        estimatedTime: '30 mins'
    });

    // Task Focus Timer State
    const [taskTimerActive, setTaskTimerActive] = useState(false);
    const [taskTimerMinutes, setTaskTimerMinutes] = useState(25);
    const [taskTimerSeconds, setTaskTimerSeconds] = useState(0);
    const [taskTimerDuration, setTaskTimerDuration] = useState(25); // in minutes

    const taskTemplates = {
        'Health': [
            { title: '🏃 Morning Exercise', description: 'Do 30 mins of cardio or stretching', priority: 'high', time: '30 mins' },
            { title: '💊 Take Medications', description: 'Take daily vitamins and medicines', priority: 'high', time: '5 mins' },
            { title: '💤 Sleep 8 Hours', description: 'Get proper rest for the day', priority: 'high', time: '8 hours' },
            { title: '🥗 Healthy Meal Prep', description: 'Prepare healthy meals for the week', priority: 'medium', time: '1 hour' }
        ],
        'Work': [
            { title: '📧 Check Emails', description: 'Review and respond to important emails', priority: 'high', time: '20 mins' },
            { title: '📊 Update Project Status', description: 'Update all ongoing projects', priority: 'high', time: '30 mins' },
            { title: '👥 Team Meeting', description: 'Attend scheduled team standup', priority: 'high', time: '1 hour' },
            { title: '🎯 Complete Sprint Tasks', description: 'Work on assigned sprint tasks', priority: 'high', time: '4 hours' }
        ],
        'Personal': [
            { title: '🧹 Clean Room', description: 'Organize and clean your workspace', priority: 'medium', time: '45 mins' },
            { title: '🧺 Do Laundry', description: 'Wash and fold clothes', priority: 'medium', time: '2 hours' },
            { title: '🛁 Personal Hygiene', description: 'Shower and grooming routine', priority: 'medium', time: '30 mins' },
            { title: '📚 Read or Learn', description: 'Dedicate time for reading or learning', priority: 'low', time: '1 hour' }
        ],
        'Shopping': [
            { title: '🛒 Grocery Shopping', description: 'Buy weekly groceries and essentials', priority: 'high', time: '1 hour' },
            { title: '🧴 Stock Essentials', description: 'Buy toiletries and household items', priority: 'medium', time: '30 mins' },
            { title: '👕 Buy Clothes', description: 'Shop for seasonal clothing', priority: 'low', time: '2 hours' }
        ],
        'Finance': [
            { title: '💰 Budget Review', description: 'Review monthly budget and spending', priority: 'high', time: '30 mins' },
            { title: '📋 Pay Bills', description: 'Pay due bills and subscriptions', priority: 'high', time: '20 mins' },
            { title: '💳 Check Bank Account', description: 'Review bank statements', priority: 'medium', time: '15 mins' },
            { title: '📊 Investment Check', description: 'Review investment portfolio', priority: 'low', time: '30 mins' }
        ]
    };

    const categories = ['All', 'Health', 'Work', 'Personal', 'Shopping', 'Finance'];

    const loadTasks = () => {
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks')
            .then(res => res.json())
            .then(data => {
                setTasks(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading tasks:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadTasks();
        setActiveFilter(filterStatus || null);
    }, [refreshTrigger, filterStatus]);

    // Task Focus Timer Effect
    useEffect(() => {
        let interval;
        if (taskTimerActive && editingId) {
            interval = setInterval(() => {
                if (taskTimerSeconds === 0) {
                    if (taskTimerMinutes === 0) {
                        // Timer complete
                        setTaskTimerActive(false);
                        alert('✓ Focus time complete for: ' + formData.title);
                    } else {
                        setTaskTimerMinutes(taskTimerMinutes - 1);
                        setTaskTimerSeconds(59);
                    }
                } else {
                    setTaskTimerSeconds(taskTimerSeconds - 1);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [taskTimerActive, taskTimerMinutes, taskTimerSeconds, editingId, formData.title]);

    const handleCreateTask = () => {
        if (!formData.title.trim()) {
            alert('Please enter a task title');
            return;
        }
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: formData.title,
                description: formData.description + (formData.estimatedTime ? ` [${formData.estimatedTime}]` : ''),
                priority: formData.priority
            })
        })
        .then(res => res.json())
        .then(data => {
            setFormData({ title: '', description: '', priority: 'medium', category: 'Personal', estimatedTime: '30 mins' });
            setShowForm(false);
            loadTasks();
            onRefresh();
        })
        .catch(err => console.error('Error creating task:', err));
    };

    const addQuickTask = (template) => {
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: template.title,
                description: template.description + ` [${template.time}]`,
                priority: template.priority
            })
        })
        .then(res => res.json())
        .then(data => {
            loadTasks();
            onRefresh();
            alert('✓ Task added: ' + template.title);
        })
        .catch(err => console.error('Error adding task:', err));
    };

    const handleCompleteTask = (taskId) => {
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks/' + taskId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
        })
        .then(res => res.json())
        .then(() => {
            loadTasks();
            onRefresh();
        })
        .catch(err => console.error('Error updating task:', err));
    };

    const handleEditTask = (task) => {
        setFormData({
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            category: 'Personal',
            estimatedTime: '30 mins'
        });
        setEditingId(task.id);
        setShowForm(true);
        // Reset timer for new task
        setTaskTimerActive(false);
        setTaskTimerMinutes(25);
        setTaskTimerSeconds(0);
        setTaskTimerDuration(25);
    };

    const handleUpdateTask = () => {
        if (!formData.title.trim()) {
            alert('Please enter a task title');
            return;
        }
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks/' + editingId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: formData.title,
                description: formData.description,
                priority: formData.priority
            })
        })
        .then(res => res.json())
        .then(data => {
            setFormData({ title: '', description: '', priority: 'medium', category: 'Personal', estimatedTime: '30 mins' });
            setEditingId(null);
            setShowForm(false);
            loadTasks();
            onRefresh();
        })
        .catch(err => console.error('Error updating task:', err));
    };

    const handleDeleteTask = (taskId) => {
        if (confirm('Delete this task?')) {
            fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks/' + taskId, { method: 'DELETE' })
            .then(() => {
                loadTasks();
                onRefresh();
            })
            .catch(err => console.error('Error deleting task:', err));
        }
    };

    const toggleTaskExpanded = (taskId) => {
        setExpandedTasks(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
    };

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', null, 'Loading Task Manager...'));

    const filteredTasks = activeFilter ? tasks.filter(t => t.status === activeFilter) : tasks;

    return React.createElement('div', { className: 'container' },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
            React.createElement('h2', null, '⚙️ Task Manager'),
            React.createElement('button', {
                onClick: () => setShowForm(!showForm),
                style: {
                    padding: '10px 20px',
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                }
            }, showForm ? '✕ Cancel' : '+ Create Task')
        ),

        React.createElement('div', { style: { 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px', 
            marginBottom: '30px' 
        }},
            React.createElement('div', { style: {
                backgroundColor: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #ddd'
            }},
                React.createElement('h3', { style: { margin: '0 0 20px 0' } }, '⚡ Quick Templates'),
                React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' } },
                    categories.map(cat => React.createElement('button', {
                        key: cat,
                        onClick: () => setSelectedCategory(cat),
                        style: {
                            padding: '8px 12px',
                            backgroundColor: selectedCategory === cat ? '#4f46e5' : '#e5e7eb',
                            color: selectedCategory === cat ? 'white' : '#666',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                        }
                    }, cat))
                ),
                selectedCategory !== 'All' && taskTemplates[selectedCategory] && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    taskTemplates[selectedCategory].map((template, idx) => React.createElement('button', {
                        key: idx,
                        onClick: () => addQuickTask(template),
                        style: {
                            padding: '10px',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            textAlign: 'left',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }
                    }, template.title + ' (' + template.time + ')'))
                )
            ),

            showForm && React.createElement('div', { style: {
                backgroundColor: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #ddd'
            }},
                React.createElement('h3', null, 'Create Custom Task'),
                React.createElement('input', {
                    type: 'text',
                    placeholder: 'Task title',
                    value: formData.title,
                    onChange: (e) => setFormData({ ...formData, title: e.target.value }),
                    style: {
                        display: 'block',
                        width: '100%',
                        padding: '10px',
                        marginBottom: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                    }
                }),
                React.createElement('textarea', {
                    placeholder: 'Description (optional)',
                    value: formData.description,
                    onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                    style: {
                        display: 'block',
                        width: '100%',
                        padding: '10px',
                        marginBottom: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px',
                        minHeight: '60px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                    }
                }),
                React.createElement('select', {
                    value: formData.priority,
                    onChange: (e) => setFormData({ ...formData, priority: e.target.value }),
                    style: {
                        display: 'block',
                        width: '100%',
                        padding: '10px',
                        marginBottom: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                    }
                },
                    React.createElement('option', { value: 'low' }, '🟢 Low Priority'),
                    React.createElement('option', { value: 'medium' }, '🟡 Medium Priority'),
                    React.createElement('option', { value: 'high' }, '🔴 High Priority')
                ),
                React.createElement('select', {
                    value: formData.estimatedTime,
                    onChange: (e) => setFormData({ ...formData, estimatedTime: e.target.value }),
                    style: {
                        display: 'block',
                        width: '100%',
                        padding: '10px',
                        marginBottom: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                    }
                },
                    React.createElement('option', { value: '5 mins' }, '⏱️ 5 mins'),
                    React.createElement('option', { value: '15 mins' }, '⏱️ 15 mins'),
                    React.createElement('option', { value: '30 mins' }, '⏱️ 30 mins'),
                    React.createElement('option', { value: '1 hour' }, '⏱️ 1 hour'),
                    React.createElement('option', { value: '2 hours' }, '⏱️ 2 hours'),
                    React.createElement('option', { value: '4 hours' }, '⏱️ 4 hours')
                ),
                React.createElement('button', {
                    onClick: editingId ? handleUpdateTask : handleCreateTask,
                    style: {
                        width: '100%',
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }
                }, editingId ? '✓ Update Task' : '✓ Create Task')
            )
        ),

        React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' } },
            React.createElement('button', {
                onClick: () => setActiveFilter(null),
                style: {
                    padding: '8px 16px',
                    backgroundColor: activeFilter === null ? '#4f46e5' : '#e5e7eb',
                    color: activeFilter === null ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            }, '🔹 All Tasks'),
            React.createElement('button', {
                onClick: () => setActiveFilter('pending'),
                style: {
                    padding: '8px 16px',
                    backgroundColor: activeFilter === 'pending' ? '#f59e0b' : '#e5e7eb',
                    color: activeFilter === 'pending' ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            }, '⏳ Pending'),
            React.createElement('button', {
                onClick: () => setActiveFilter('completed'),
                style: {
                    padding: '8px 16px',
                    backgroundColor: activeFilter === 'completed' ? '#10b981' : '#e5e7eb',
                    color: activeFilter === 'completed' ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            }, '✓ Completed')
        ),

        filteredTasks.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px', color: '#999' } },
            React.createElement('p', { style: { fontSize: '18px', marginBottom: '10px' } }, '📝 No tasks yet'),
            React.createElement('p', null, 'Use quick templates or create a custom task to get started!')
        ),

        editingId && React.createElement('div', { style: {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999'
        },
        onClick: (e) => {
            if (e.target === e.currentTarget) {
                setEditingId(null);
                setTaskTimerActive(false);
                setTaskTimerMinutes(25);
                setTaskTimerSeconds(0);
                setFormData({ title: '', description: '', priority: 'medium', category: 'Personal', estimatedTime: '30 mins' });
            }
        }},
            React.createElement('div', { style: {
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
            }},
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                    React.createElement('h2', { style: { margin: '0', color: '#1f2937', fontSize: '20px', fontWeight: '700' } }, '✏️ Edit Task'),
                    React.createElement('button', {
                        onClick: () => {
                            setEditingId(null);
                            setTaskTimerActive(false);
                            setTaskTimerMinutes(25);
                            setTaskTimerSeconds(0);
                            setFormData({ title: '', description: '', priority: 'medium', category: 'Personal', estimatedTime: '30 mins' });
                        },
                        style: {
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '0',
                            color: '#999'
                        }
                    }, '✕')
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Task Title *'),
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Task title',
                        value: formData.title,
                        onChange: (e) => setFormData({ ...formData, title: e.target.value }),
                        style: {
                            display: 'block',
                            width: '100%',
                            padding: '10px',
                            marginBottom: '15px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                        }
                    }),
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Description'),
                    React.createElement('textarea', {
                        placeholder: 'Description (optional)',
                        value: formData.description,
                        onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                        style: {
                            display: 'block',
                            width: '100%',
                            padding: '10px',
                            marginBottom: '15px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            minHeight: '80px',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                        }
                    }),
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Priority'),
                    React.createElement('select', {
                        value: formData.priority,
                        onChange: (e) => setFormData({ ...formData, priority: e.target.value }),
                        style: {
                            display: 'block',
                            width: '100%',
                            padding: '10px',
                            marginBottom: '20px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            backgroundColor: 'white'
                        }
                    },
                        React.createElement('option', { value: 'low' }, '🟢 Low Priority'),
                        React.createElement('option', { value: 'medium' }, '🟡 Medium Priority'),
                        React.createElement('option', { value: 'high' }, '🔴 High Priority')
                    ),

                    // Focus Timer Section
                    React.createElement('div', { style: { 
                        backgroundColor: '#fef3c7',
                        border: '2px solid #fbbf24',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '20px'
                    }},
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' } },
                            React.createElement('label', { style: { fontWeight: '700', color: '#92400e', fontSize: '14px', margin: '0' } }, '⏱️ Focus Timer'),
                            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                                React.createElement('button', {
                                    onClick: () => {
                                        if (!taskTimerActive) {
                                            if (taskTimerMinutes > 0 || taskTimerSeconds > 0) {
                                                if (taskTimerSeconds > 0) {
                                                    setTaskTimerSeconds(taskTimerSeconds - 1);
                                                } else if (taskTimerMinutes > 0) {
                                                    setTaskTimerMinutes(taskTimerMinutes - 1);
                                                    setTaskTimerSeconds(59);
                                                }
                                            }
                                        }
                                    },
                                    style: {
                                        padding: '6px 10px',
                                        backgroundColor: taskTimerActive ? '#d1d5db' : '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: taskTimerActive ? 'not-allowed' : 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }
                                }, '−'),
                                React.createElement('div', { style: { 
                                    backgroundColor: 'white',
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#1f2937',
                                    fontFamily: 'monospace',
                                    minWidth: '100px',
                                    textAlign: 'center',
                                    border: '2px solid #fbbf24'
                                }}, 
                                    String(taskTimerMinutes).padStart(2, '0') + ':' + String(taskTimerSeconds).padStart(2, '0')
                                ),
                                React.createElement('button', {
                                    onClick: () => {
                                        if (!taskTimerActive) {
                                            if (taskTimerSeconds < 59) {
                                                setTaskTimerSeconds(taskTimerSeconds + 1);
                                            } else {
                                                setTaskTimerMinutes(taskTimerMinutes + 1);
                                                setTaskTimerSeconds(0);
                                            }
                                        }
                                    },
                                    style: {
                                        padding: '6px 10px',
                                        backgroundColor: taskTimerActive ? '#d1d5db' : '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: taskTimerActive ? 'not-allowed' : 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }
                                }, '+')
                            )
                        ),
                        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' } },
                            React.createElement('button', {
                                onClick: () => { setTaskTimerDuration(5); setTaskTimerMinutes(5); setTaskTimerSeconds(0); },
                                style: {
                                    padding: '6px',
                                    backgroundColor: taskTimerDuration === 5 ? '#f59e0b' : 'white',
                                    color: taskTimerDuration === 5 ? 'white' : '#333',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }
                            }, '5m'),
                            React.createElement('button', {
                                onClick: () => { setTaskTimerDuration(15); setTaskTimerMinutes(15); setTaskTimerSeconds(0); },
                                style: {
                                    padding: '6px',
                                    backgroundColor: taskTimerDuration === 15 ? '#f59e0b' : 'white',
                                    color: taskTimerDuration === 15 ? 'white' : '#333',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }
                            }, '15m'),
                            React.createElement('button', {
                                onClick: () => { setTaskTimerDuration(25); setTaskTimerMinutes(25); setTaskTimerSeconds(0); },
                                style: {
                                    padding: '6px',
                                    backgroundColor: taskTimerDuration === 25 ? '#f59e0b' : 'white',
                                    color: taskTimerDuration === 25 ? 'white' : '#333',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }
                            }, '25m'),
                            React.createElement('button', {
                                onClick: () => { setTaskTimerDuration(45); setTaskTimerMinutes(45); setTaskTimerSeconds(0); },
                                style: {
                                    padding: '6px',
                                    backgroundColor: taskTimerDuration === 45 ? '#f59e0b' : 'white',
                                    color: taskTimerDuration === 45 ? 'white' : '#333',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }
                            }, '45m')
                        ),
                        React.createElement('div', { style: { display: 'flex', gap: '8px' } },
                            React.createElement('button', {
                                onClick: () => setTaskTimerActive(!taskTimerActive),
                                style: {
                                    flex: 1,
                                    padding: '8px',
                                    backgroundColor: taskTimerActive ? '#ef4444' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '12px'
                                }
                            }, taskTimerActive ? '⏸ Pause' : '▶ Start'),
                            React.createElement('button', {
                                onClick: () => {
                                    setTaskTimerActive(false);
                                    setTaskTimerMinutes(taskTimerDuration);
                                    setTaskTimerSeconds(0);
                                },
                                style: {
                                    flex: 1,
                                    padding: '8px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '12px'
                                }
                            }, '⏹ Reset')
                        )
                    ),

                    React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                        React.createElement('button', {
                            onClick: () => {
                                setEditingId(null);
                                setTaskTimerActive(false);
                                setTaskTimerMinutes(25);
                                setTaskTimerSeconds(0);
                                setFormData({ title: '', description: '', priority: 'medium', category: 'Personal', estimatedTime: '30 mins' });
                            },
                            style: {
                                flex: 1,
                                padding: '10px 20px',
                                backgroundColor: '#e5e7eb',
                                color: '#333',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px'
                            }
                        }, 'Cancel'),
                        React.createElement('button', {
                            onClick: handleUpdateTask,
                            style: {
                                flex: 1,
                                padding: '10px 20px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px'
                            }
                        }, 'Save Changes')
                    )
                )
            )
        ),

        filteredTasks.map((task, idx) => React.createElement('div', { key: task.id, style: {
            backgroundColor: 'white',
            padding: '18px',
            marginBottom: '12px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #3b82f6',
            animation: 'slideUp 0.4s ease-out backwards',
            animationDelay: `${idx * 0.08}s`,
            transition: 'all 0.2s'
        },
        onMouseEnter: (e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
        },
        onMouseLeave: (e) => {
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
        }},
            // Header with toggle button
            React.createElement('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
                React.createElement('button', {
                    onClick: () => toggleTaskExpanded(task.id),
                    style: {
                        padding: '6px 10px',
                        backgroundColor: 'transparent',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#3b82f6',
                        transition: 'all 0.2s'
                    }
                }, expandedTasks[task.id] ? '▼ Collapse' : '▶ Expand'),
                React.createElement('h3', { style: { margin: '0', flex: 1, color: '#1f2937', fontSize: '14px', fontWeight: '600' } }, task.title),
                React.createElement('span', { style: { backgroundColor: task.priority === 'high' ? '#fee2e2' : task.priority === 'medium' ? '#fef3c7' : '#dcfce7', color: task.priority === 'high' ? '#991b1b' : task.priority === 'medium' ? '#92400e' : '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' } }, task.priority)
            ),
            
            // Expanded content
            expandedTasks[task.id] && React.createElement('div', { style: { 
                backgroundColor: '#f9fafb',
                padding: '12px',
                borderRadius: '4px',
                borderLeft: '4px solid #3b82f6'
            }},
                task.description && React.createElement('p', { style: { margin: '0 0 10px 0', color: '#555', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, task.description),
                React.createElement('p', { style: { margin: '0', color: '#9ca3af', fontSize: '11px' } }, '📊 Status: ' + (task.status === 'completed' ? '✓ Completed' : '⏳ Pending'))
            ),
            
            // Collapsed preview
            !expandedTasks[task.id] && task.description && React.createElement('p', { style: { margin: '0 0 8px 0', color: '#666', fontSize: '13px', maxHeight: '80px', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' } }, task.description.substring(0, 150) + (task.description.length > 150 ? '...' : '')),
            
            // Action buttons
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
                task.status !== 'completed' && React.createElement('button', {
                    onClick: () => handleCompleteTask(task.id),
                    style: {
                        padding: '8px 12px',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.backgroundColor = '#a7f3d0';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = '#d1fae5';
                    }
                }, '✓ Done'),
                React.createElement('button', {
                    onClick: () => handleEditTask(task),
                    style: {
                        padding: '8px 12px',
                        backgroundColor: '#dbeafe',
                        color: '#0c4a6e',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.backgroundColor = '#bfdbfe';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                    }
                }, '✏️ Edit'),
                React.createElement('button', {
                    onClick: () => handleDeleteTask(task.id),
                    style: {
                        padding: '8px 12px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.backgroundColor = '#fecaca';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                    }
                }, '✕ Delete')
            )
        ))
    );
}

// ====== SCHEDULE COMPONENT ======
function Schedule({ refreshTrigger, onRefresh }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ 
        title: '', 
        description: '',
        date: '', 
        time: '', 
        status: 'upcoming',
        priority: 'medium'
    });
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');

    const loadEvents = () => {
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/schedule')
            .then(res => res.json())
            .then(data => {
                setEvents(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading events:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadEvents();
    }, [refreshTrigger]);

    const resetForm = () => {
        setFormData({ 
            title: '', 
            description: '',
            date: '', 
            time: '', 
            status: 'upcoming',
            priority: 'medium'
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleCreateEvent = () => {
        if (!formData.title.trim() || !formData.date) {
            alert('Please enter event title and date');
            return;
        }
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: formData.title,
                description: formData.description,
                event_time: formData.date + 'T' + (formData.time || '09:00:00'),
                status: formData.status,
                priority: formData.priority
            })
        })
        .then(res => res.json())
        .then(data => {
            loadEvents();
            onRefresh();
            resetForm();
        })
        .catch(err => {
            console.error('Error creating event:', err);
            alert('Error creating event');
        });
    };

    const handleEditEvent = (event) => {
        const eventDate = new Date(event.event_time);
        const dateStr = eventDate.toISOString().split('T')[0];
        const timeStr = eventDate.toTimeString().slice(0, 5);
        
        setFormData({
            title: event.title,
            description: event.description || '',
            date: dateStr,
            time: timeStr,
            status: event.status || 'upcoming',
            priority: event.priority || 'medium'
        });
        setEditingId(event.id);
    };

    const handleUpdateEvent = () => {
        if (!formData.title.trim() || !formData.date) {
            alert('Please enter event title and date');
            return;
        }
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/schedule/' + editingId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: formData.title,
                description: formData.description,
                event_time: formData.date + 'T' + (formData.time || '09:00:00'),
                status: formData.status,
                priority: formData.priority
            })
        })
        .then(res => res.json())
        .then(data => {
            loadEvents();
            onRefresh();
            resetForm();
        })
        .catch(err => {
            console.error('Error updating event:', err);
            alert('Error updating event');
        });
    };

    const handleDeleteEvent = (eventId) => {
        if (confirm('Delete this event?')) {
            fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/schedule/' + eventId, { method: 'DELETE' })
            .then(() => {
                loadEvents();
                onRefresh();
            })
            .catch(err => {
                console.error('Error deleting event:', err);
                alert('Error deleting event');
            });
        }
    };

    const groupEventsByDate = (eventList) => {
        const groups = {};
        eventList.forEach(event => {
            const date = new Date(event.event_time).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(event);
        });
        return groups;
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'completed': return { bg: '#dcfce7', text: '#166534', badge: '✓' };
            case 'important': return { bg: '#fee2e2', text: '#991b1b', badge: '!' };
            default: return { bg: '#eff6ff', text: '#0c4a6e', badge: '📅' };
        }
    };

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'high': return { bg: '#fee2e2', text: '#991b1b', label: '🔴 High', border: '#fca5a5' };
            case 'medium': return { bg: '#fef08a', text: '#854d0e', label: '🟡 Medium', border: '#fde047' };
            case 'low': return { bg: '#dbeafe', text: '#0c4a6e', label: '🟢 Low', border: '#93c5fd' };
            default: return { bg: '#fef08a', text: '#854d0e', label: '🟡 Medium', border: '#fde047' };
        }
    };

    const filteredEvents = (() => {
        let result = filterStatus === 'all' 
            ? events 
            : events.filter(e => e.status === filterStatus);
        
        if (filterPriority !== 'all') {
            result = result.filter(e => (e.priority || 'medium') === filterPriority);
        }
        return result;
    })();
    
    const groupedEvents = groupEventsByDate(filteredEvents);
    const sortedDates = Object.keys(groupedEvents).sort();

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', { style: { textAlign: 'center', color: '#999' } }, 'Loading calendar...'));

    return React.createElement('div', { className: 'container' },
        // Header
        React.createElement('div', { style: { marginBottom: '30px' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                React.createElement('div', null,
                    React.createElement('h2', { style: { margin: '0 0 8px 0', color: '#1f2937', fontSize: '24px', fontWeight: '700' } }, '📅 Schedule'),
                    React.createElement('p', { style: { margin: '0', color: '#9ca3af', fontSize: '13px' } }, 'Manage and organize your events')
                ),
                React.createElement('button', { onClick: () => { setShowForm(!showForm); if (showForm) resetForm(); }, style: { padding: '10px 18px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' } }, showForm ? '✕ Cancel' : '➕ New Event')
            ),

            React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#1f2937', fontSize: '13px', fontWeight: '600' } }, 'Filter by Status:'),
            React.createElement('div', { style: { display: 'flex', gap: '8px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '15px', flexWrap: 'wrap' } },
                React.createElement('button', { onClick: () => setFilterStatus('all'), style: { padding: '6px 14px', backgroundColor: filterStatus === 'all' ? '#8b5cf6' : '#f3f4f6', color: filterStatus === 'all' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, 'All Events'),
                React.createElement('button', { onClick: () => setFilterStatus('upcoming'), style: { padding: '6px 14px', backgroundColor: filterStatus === 'upcoming' ? '#8b5cf6' : '#f3f4f6', color: filterStatus === 'upcoming' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '📅 Upcoming'),
                React.createElement('button', { onClick: () => setFilterStatus('important'), style: { padding: '6px 14px', backgroundColor: filterStatus === 'important' ? '#8b5cf6' : '#f3f4f6', color: filterStatus === 'important' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '⚠️ Important'),
                React.createElement('button', { onClick: () => setFilterStatus('completed'), style: { padding: '6px 14px', backgroundColor: filterStatus === 'completed' ? '#8b5cf6' : '#f3f4f6', color: filterStatus === 'completed' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '✓ Completed')
            ),

            React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#1f2937', fontSize: '13px', fontWeight: '600' } }, 'Filter by Priority:'),
            React.createElement('div', { style: { display: 'flex', gap: '8px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px', flexWrap: 'wrap' } },
                React.createElement('button', { onClick: () => setFilterPriority('all'), style: { padding: '6px 14px', backgroundColor: filterPriority === 'all' ? '#8b5cf6' : '#f3f4f6', color: filterPriority === 'all' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, 'All Priorities'),
                React.createElement('button', { onClick: () => setFilterPriority('high'), style: { padding: '6px 14px', backgroundColor: filterPriority === 'high' ? '#dc2626' : '#f3f4f6', color: filterPriority === 'high' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '🔴 High'),
                React.createElement('button', { onClick: () => setFilterPriority('medium'), style: { padding: '6px 14px', backgroundColor: filterPriority === 'medium' ? '#ea580c' : '#f3f4f6', color: filterPriority === 'medium' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '🟡 Medium'),
                React.createElement('button', { onClick: () => setFilterPriority('low'), style: { padding: '6px 14px', backgroundColor: filterPriority === 'low' ? '#16a34a' : '#f3f4f6', color: filterPriority === 'low' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '🟢 Low')
            )
        ),

        // Create/Edit Event Form
        showForm && React.createElement('div', { style: { backgroundColor: '#f0f4ff', padding: '24px', borderRadius: '12px', marginBottom: '30px', border: '2px solid #8b5cf6' } },
            React.createElement('h3', { style: { margin: '0 0 20px 0', color: '#1f2937', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' } }, editingId ? '✏️ Edit Event' : '✨ Create New Event'),
            React.createElement('div', { style: { marginBottom: '15px' } },
                React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Event Title *'),
                React.createElement('input', { type: 'text', placeholder: 'e.g., Team Meeting', value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' } })
            ),
            React.createElement('div', { style: { marginBottom: '15px' } },
                React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Description'),
                React.createElement('textarea', { placeholder: 'Add event details...', value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px', resize: 'vertical' } })
            ),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' } },
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Date *'),
                    React.createElement('input', { type: 'date', value: formData.date, onChange: (e) => setFormData({ ...formData, date: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' } })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Time'),
                    React.createElement('input', { type: 'time', value: formData.time, onChange: (e) => setFormData({ ...formData, time: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' } })
                )
            ),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' } },
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Priority'),
                    React.createElement('select', { value: formData.priority, onChange: (e) => setFormData({ ...formData, priority: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'white' } },
                        React.createElement('option', { value: 'low' }, '🟢 Low'),
                        React.createElement('option', { value: 'medium' }, '🟡 Medium'),
                        React.createElement('option', { value: 'high' }, '🔴 High')
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Status'),
                    React.createElement('select', { value: formData.status, onChange: (e) => setFormData({ ...formData, status: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'white' } },
                        React.createElement('option', { value: 'upcoming' }, '📅 Upcoming'),
                        React.createElement('option', { value: 'important' }, '⚠️ Important'),
                        React.createElement('option', { value: 'completed' }, '✓ Completed')
                    )
                )
            ),
            React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                React.createElement('button', { onClick: resetForm, style: { flex: 1, padding: '10px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' } }, 'Cancel'),
                React.createElement('button', { onClick: editingId ? handleUpdateEvent : handleCreateEvent, style: { flex: 1, padding: '10px 20px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' } }, editingId ? 'Update Event' : 'Create Event')
            )
        ),

        // Events List
        filteredEvents.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb' } },
            React.createElement('p', { style: { fontSize: '32px', margin: '0 0 10px 0' } }, '📅'),
            React.createElement('h3', { style: { margin: '0 0 8px 0', color: '#666' } }, 'No events scheduled'),
            React.createElement('p', { style: { margin: '0', color: '#999', fontSize: '13px' } }, 'Create an event to get started!')
        ),

        // Grouped Events
        sortedDates.map(date => React.createElement('div', { key: date, style: { marginBottom: '30px' } },
            React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#1f2937', fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '2px solid #8b5cf6', paddingBottom: '10px' } }, '📆 ' + date),
            
            groupedEvents[date].map((event, idx) => {
                const statusColor = getStatusColor(event.status || 'upcoming');
                const priorityColor = getPriorityColor(event.priority || 'medium');
                const eventDate = new Date(event.event_time);
                const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                return React.createElement('div', { key: event.id, style: { backgroundColor: 'white', padding: '16px', marginBottom: '12px', borderRadius: '10px', border: '2px solid ' + priorityColor.border, display: 'flex', flexDirection: 'column', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', animation: 'slideUp 0.4s ease-out backwards', animationDelay: idx * 0.08 + 's' }, onMouseEnter: (e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }, onMouseLeave: (e) => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; } },
                    // Top section - Content with priority on right
                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' } },
                        React.createElement('div', { style: { flex: 1 } },
                            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
                                React.createElement('span', { style: { fontSize: '18px' } }, statusColor.badge),
                                React.createElement('h4', { style: { margin: '0', color: '#1f2937', fontSize: '14px', fontWeight: '600' } }, event.title),
                                React.createElement('span', { style: { backgroundColor: statusColor.bg, color: statusColor.text, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize' } }, event.status || 'upcoming')
                            ),
                            React.createElement('p', { style: { margin: '0 0 6px 0', color: '#9ca3af', fontSize: '12px' } }, '⏰ ' + timeStr),
                            event.description && React.createElement('p', { style: { margin: '0', color: '#6b7280', fontSize: '13px', lineHeight: '1.4' } }, event.description)
                        ),
                        // Right side - Priority
                        React.createElement('div', { style: { display: 'flex', flexShrink: 0, marginLeft: '12px' } },
                            React.createElement('span', { style: { backgroundColor: priorityColor.bg, color: priorityColor.text, padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' } }, priorityColor.label)
                        )
                    ),
                    // Bottom section - Buttons on left
                    React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                        React.createElement('button', { onClick: () => { handleEditEvent(event); setShowForm(true); }, style: { padding: '6px 10px', backgroundColor: '#dbeafe', color: '#0c4a6e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap' }, onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = '#bfdbfe'; }, onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; } }, '✏️ Edit'),
                        React.createElement('button', { onClick: () => handleDeleteEvent(event.id), style: { padding: '6px 10px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap' }, onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = '#fecaca'; }, onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; } }, '✕ Delete')
                    )
                );
            })
        ))
    );
}

// ====== NOTES COMPONENT ======
function Notes({ refreshTrigger, onRefresh }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [expandedNotes, setExpandedNotes] = useState({});
    const [formData, setFormData] = useState({ title: '', content: '', category: 'general' });
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = ['general', 'ideas', 'tasks', 'meeting', 'research'];
    const categoryColors = {
        general: '#06b6d4',
        ideas: '#ec4899',
        tasks: '#f59e0b',
        meeting: '#8b5cf6',
        research: '#3b82f6'
    };

    const loadNotes = () => {
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/notes')
            .then(res => res.json())
            .then(data => {
                setNotes((data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading notes:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadNotes();
    }, [refreshTrigger]);

    const handleCreateNote = () => {
        if (!formData.title.trim() || !formData.content.trim()) {
            alert('Please enter note title and content');
            return;
        }
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
            setFormData({ title: '', content: '', category: 'general' });
            setShowForm(false);
            loadNotes();
            onRefresh();
        })
        .catch(err => {
            console.error('Error creating note:', err);
            alert('Error creating note');
        });
    };

    const handleEditNote = (note) => {
        setFormData({
            title: note.title,
            content: note.content,
            category: note.category || 'general'
        });
        setEditingId(note.id);
        setShowForm(true);
    };

    const handleUpdateNote = () => {
        if (!formData.title.trim() || !formData.content.trim()) {
            alert('Please enter note title and content');
            return;
        }
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/notes/' + editingId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
            setFormData({ title: '', content: '', category: 'general' });
            setEditingId(null);
            setShowForm(false);
            loadNotes();
            onRefresh();
        })
        .catch(err => {
            console.error('Error updating note:', err);
            alert('Error updating note');
        });
    };

    const handleDeleteNote = (noteId) => {
        if (confirm('Delete this note?')) {
            fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/notes/' + noteId, { method: 'DELETE' })
            .then(() => {
                loadNotes();
                onRefresh();
            })
            .catch(err => {
                console.error('Error deleting note:', err);
                alert('Error deleting note');
            });
        }
    };

    const toggleNoteExpanded = (noteId) => {
        setExpandedNotes(prev => ({
            ...prev,
            [noteId]: !prev[noteId]
        }));
    };

    const filteredNotes = notes.filter(note => {
        const matchCategory = filterCategory === 'all' || note.category === filterCategory;
        const matchSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           note.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', { style: { textAlign: 'center', color: '#999' } }, 'Loading notes...'));

    return React.createElement('div', { className: 'container' },
        editingId && React.createElement('div', { style: {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999'
        },
        onClick: (e) => {
            if (e.target === e.currentTarget) {
                setEditingId(null);
                setFormData({ title: '', content: '', category: 'general' });
            }
        }},
            React.createElement('div', { style: {
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
            }},
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                    React.createElement('h2', { style: { margin: '0', color: '#1f2937', fontSize: '20px', fontWeight: '700' } }, '✏️ Edit Note'),
                    React.createElement('button', {
                        onClick: () => {
                            setEditingId(null);
                            setFormData({ title: '', content: '', category: 'general' });
                        },
                        style: {
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '0',
                            color: '#999'
                        }
                    }, '✕')
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Note Title *'),
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'e.g., Project Ideas',
                        value: formData.title,
                        onChange: (e) => setFormData({ ...formData, title: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            marginBottom: '15px'
                        }
                    }),
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Category'),
                    React.createElement('select', {
                        value: formData.category,
                        onChange: (e) => setFormData({ ...formData, category: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            backgroundColor: 'white',
                            marginBottom: '15px'
                        }
                    },
                        categories.map(cat => React.createElement('option', { key: cat, value: cat }, cat.charAt(0).toUpperCase() + cat.slice(1)))
                    ),
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Content *'),
                    React.createElement('textarea', {
                        placeholder: 'Write your note here...',
                        value: formData.content,
                        onChange: (e) => setFormData({ ...formData, content: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '13px',
                            minHeight: '120px',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                            resize: 'vertical',
                            marginBottom: '20px'
                        }
                    }),
                    React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                        React.createElement('button', {
                            onClick: () => {
                                setEditingId(null);
                                setFormData({ title: '', content: '', category: 'general' });
                            },
                            style: {
                                flex: 1,
                                padding: '10px 20px',
                                backgroundColor: '#e5e7eb',
                                color: '#333',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px'
                            }
                        }, 'Cancel'),
                        React.createElement('button', {
                            onClick: handleUpdateNote,
                            style: {
                                flex: 1,
                                padding: '10px 20px',
                                backgroundColor: '#06b6d4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px'
                            }
                        }, 'Save Changes')
                    )
                )
            )
        ),
        // Header
        React.createElement('div', { style: { marginBottom: '30px' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                React.createElement('div', null,
                    React.createElement('h2', { style: { margin: '0 0 8px 0', color: '#1f2937', fontSize: '24px', fontWeight: '700' } }, '📝 Notes'),
                    React.createElement('p', { style: { margin: '0', color: '#9ca3af', fontSize: '13px' } }, 'Capture ideas and important information')
                ),
                React.createElement('button', {
                    onClick: () => setShowForm(!showForm),
                    style: {
                        padding: '10px 18px',
                        backgroundColor: '#06b6d4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }
                }, showForm ? '✕ Cancel' : '➕ New Note')
            ),

            // Search
            React.createElement('div', { style: { marginBottom: '15px' } },
                React.createElement('input', {
                    type: 'text',
                    placeholder: 'Search notes...',
                    value: searchQuery,
                    onChange: (e) => setSearchQuery(e.target.value),
                    style: {
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                    }
                })
            ),

            // Category filters
            React.createElement('div', { style: { display: 'flex', gap: '8px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', overflowX: 'auto' } },
                React.createElement('button', {
                    onClick: () => setFilterCategory('all'),
                    style: {
                        padding: '6px 14px',
                        backgroundColor: filterCategory === 'all' ? '#06b6d4' : '#f3f4f6',
                        color: filterCategory === 'all' ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                    }
                }, 'All'),
                categories.map(cat => React.createElement('button', {
                    key: cat,
                    onClick: () => setFilterCategory(cat),
                    style: {
                        padding: '6px 14px',
                        backgroundColor: filterCategory === cat ? categoryColors[cat] : '#f3f4f6',
                        color: filterCategory === cat ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        textTransform: 'capitalize'
                    }
                }, cat))
            )
        ),

        // Create Note Form
        showForm && React.createElement('div', { style: {
            backgroundColor: '#f0f4ff',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '2px solid #06b6d4'
        }},
            React.createElement('h3', { style: { margin: '0 0 20px 0', color: '#1f2937', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' } }, '✨ Create New Note'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' } },
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Note Title *'),
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'e.g., Project Ideas',
                        value: formData.title,
                        onChange: (e) => setFormData({ ...formData, title: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                        }
                    })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Category'),
                    React.createElement('select', {
                        value: formData.category,
                        onChange: (e) => setFormData({ ...formData, category: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            backgroundColor: 'white'
                        }
                    },
                        categories.map(cat => React.createElement('option', { key: cat, value: cat }, cat.charAt(0).toUpperCase() + cat.slice(1)))
                    )
                )
            ),
            React.createElement('div', { style: { marginBottom: '15px' } },
                React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '13px' } }, 'Content *'),
                React.createElement('textarea', {
                    placeholder: 'Write your note here...',
                    value: formData.content,
                    onChange: (e) => setFormData({ ...formData, content: e.target.value }),
                    style: {
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '13px',
                        minHeight: '120px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                    }
                })
            ),
            React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                React.createElement('button', {
                    onClick: () => {
                        setShowForm(false);
                        setFormData({ title: '', content: '', category: 'general' });
                    },
                    style: {
                        flex: 1,
                        padding: '10px 20px',
                        backgroundColor: '#e5e7eb',
                        color: '#333',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px'
                    }
                }, 'Cancel'),
                React.createElement('button', {
                    onClick: editingId ? handleUpdateNote : handleCreateNote,
                    style: {
                        flex: 1,
                        padding: '10px 20px',
                        backgroundColor: '#06b6d4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px'
                    }
                }, editingId ? 'Update Note' : 'Create Note')
            )
        ),

        // Notes List
        filteredNotes.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb' } },
            React.createElement('p', { style: { fontSize: '32px', margin: '0 0 10px 0' } }, '📝'),
            React.createElement('h3', { style: { margin: '0 0 8px 0', color: '#666' } }, 'No notes found'),
            React.createElement('p', { style: { margin: '0', color: '#999', fontSize: '13px' } }, searchQuery ? 'Try a different search query' : 'Create a note to get started!')
        ),

        filteredNotes.map((note, idx) => React.createElement('div', { key: note.id, style: {
            backgroundColor: 'white',
            padding: '18px',
            marginBottom: '12px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            borderLeft: '4px solid ' + (categoryColors[note.category] || '#06b6d4'),
            animation: 'slideUp 0.4s ease-out backwards',
            animationDelay: `${idx * 0.08}s`,
            transition: 'all 0.2s'
        },
        onMouseEnter: (e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
        },
        onMouseLeave: (e) => {
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
        }},
            // Header with toggle button
            React.createElement('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
                React.createElement('button', {
                    onClick: () => toggleNoteExpanded(note.id),
                    style: {
                        padding: '6px 10px',
                        backgroundColor: 'transparent',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#06b6d4',
                        transition: 'all 0.2s'
                    }
                }, expandedNotes[note.id] ? '▼ Collapse' : '▶ Expand'),
                React.createElement('h3', { style: { margin: '0', flex: 1, color: '#1f2937', fontSize: '14px', fontWeight: '600' } }, note.title),
                React.createElement('span', { style: { backgroundColor: categoryColors[note.category] || '#06b6d4', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' } }, note.category || 'general')
            ),
            
            // Expanded content
            expandedNotes[note.id] && React.createElement('div', { style: {
                backgroundColor: '#f9fafb',
                padding: '12px',
                borderRadius: '4px',
                borderLeft: '4px solid ' + (categoryColors[note.category] || '#06b6d4')
            }},
                React.createElement('p', { style: { margin: '0 0 8px 0', color: '#555', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, note.content),
                React.createElement('p', { style: { margin: '0', color: '#9ca3af', fontSize: '11px' } }, '📅 ' + new Date(note.created_at).toLocaleDateString() + ' at ' + new Date(note.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
            ),
            
            // Collapsed preview
            !expandedNotes[note.id] && React.createElement('p', { style: { margin: '0 0 8px 0', color: '#666', fontSize: '13px', maxHeight: '80px', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' } }, note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '')),
            
            // Action buttons
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
                React.createElement('button', {
                    onClick: () => handleEditNote(note),
                    style: {
                        padding: '8px 12px',
                        backgroundColor: '#dbeafe',
                        color: '#0c4a6e',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.backgroundColor = '#bfdbfe';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                    }
                }, '✏️ Edit'),
                React.createElement('button', {
                    onClick: () => handleDeleteNote(note.id),
                    style: {
                        padding: '8px 12px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.backgroundColor = '#fecaca';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                    }
                }, '✕ Delete')
            )
        ))
    );
}

// ====== WORKFLOW COMPONENT ======
function Workflow({ refreshTrigger, onRefresh }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [formData, setFormData] = useState({ description: '', workflowType: 'general' });
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    const workflowTemplates = [
        {
            type: 'general',
            name: '🎯 General Task',
            icon: '🎯',
            description: 'Execute any general task with AI coordination',
            example: 'Create a weekly task schedule based on my priorities'
        },
        {
            type: 'planning',
            name: '📋 Project Planning',
            icon: '📋',
            description: 'Plan and organize a project with multiple tasks',
            example: 'Create a plan for launching a new product'
        },
        {
            type: 'analysis',
            name: '📊 Data Analysis',
            icon: '📊',
            description: 'Analyze tasks and provide insights',
            example: 'Analyze my task completion patterns'
        },
        {
            type: 'automation',
            name: '⚙️ Task Automation',
            icon: '⚙️',
            description: 'Automate repetitive tasks',
            example: 'Create recurring reminders for daily standup meetings'
        }
    ];

    const loadWorkflows = () => {
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/workflow/history/all')
            .then(res => res.json())
            .then(data => {
                setWorkflows((data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading workflows:', err);
                setWorkflows([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadWorkflows();
    }, [refreshTrigger]);

    const handleExecuteWorkflow = () => {
        if (!formData.description.trim()) {
            alert('Please describe what you want the AI to accomplish');
            return;
        }

        setExecuting(true);
        const fullRequest = `[${formData.workflowType.toUpperCase()}] ${formData.description}`;
        
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                request: fullRequest
            })
        })
        .then(res => res.json())
        .then(data => {
            setFormData({ description: '', workflowType: 'general' });
            setExecuting(false);
            alert('✓ Workflow Started! ID: ' + data.id + '\n\nStatus: ' + data.status);
            loadWorkflows();
            onRefresh();
        })
        .catch(err => {
            console.error('Error:', err);
            setExecuting(false);
            alert('❌ Error executing workflow. Check console for details.');
        });
    };

    const filteredWorkflows = filterStatus === 'all' 
        ? workflows 
        : workflows.filter(w => w.status === filterStatus);

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', { style: { textAlign: 'center', color: '#999' } }, 'Loading workflows...'));

    return React.createElement('div', { className: 'container' },
        // Header
        React.createElement('div', { style: { marginBottom: '30px' } },
            React.createElement('div', null,
                React.createElement('h2', { style: { margin: '0 0 8px 0', color: '#1f2937', fontSize: '24px', fontWeight: '700' } }, '🤖 Multi-Agent Workflows'),
                React.createElement('p', { style: { margin: '0 0 20px 0', color: '#9ca3af', fontSize: '13px' } }, 'Coordinate multiple AI agents to accomplish complex tasks')
            )
        ),

        // Workflow Templates
        React.createElement('div', { style: { marginBottom: '30px', padding: '24px', backgroundColor: '#f0f4ff', borderRadius: '12px', border: '1px solid #bfdbfe' } },
            React.createElement('h3', { style: { margin: '0 0 20px 0', color: '#1f2937', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' } }, '✨ Choose Workflow Template'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' } },
                workflowTemplates.map(template => React.createElement('div', { key: template.type, style: {
                    padding: '18px',
                    border: formData.workflowType === template.type ? '2px solid #8b5cf6' : '1px solid #d1d5db',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    backgroundColor: formData.workflowType === template.type ? 'white' : '#ffffff',
                    transition: 'all 0.2s',
                    boxShadow: formData.workflowType === template.type ? '0 4px 12px rgba(139, 92, 246, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
                }, onClick: () => setFormData({ ...formData, workflowType: template.type }),
                onMouseEnter: (e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                },
                onMouseLeave: (e) => {
                    e.currentTarget.style.boxShadow = formData.workflowType === template.type ? '0 4px 12px rgba(139, 92, 246, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }},
                    React.createElement('span', { style: { fontSize: '28px', display: 'block', marginBottom: '12px' } }, template.icon),
                    React.createElement('h4', { style: { margin: '0 0 8px 0', color: '#1f2937', fontSize: '14px', fontWeight: '600' } }, template.name),
                    React.createElement('p', { style: { margin: '0 0 10px 0', color: '#666', fontSize: '12px', lineHeight: '1.4' } }, template.description),
                    React.createElement('p', { style: { margin: '0', color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' } }, '💡 ' + template.example)
                ))
            )
        ),

        // Workflow Execution Form
        React.createElement('div', { style: {
            backgroundColor: '#f5f5f5',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
            border: '1px solid #ddd'
        }},
            React.createElement('h3', { style: { marginTop: 0 } }, '▶ Execute Workflow'),
            React.createElement('p', { style: { color: '#666', fontSize: '14px', marginBottom: '15px' } }, 'Describe the task you want the multi-agent system to accomplish. Agents will coordinate intelligently to complete it.'),
            React.createElement('textarea', {
                placeholder: 'Describe your task in detail. Be specific about what you want to accomplish...',
                value: formData.description,
                onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                style: {
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    marginBottom: '15px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minHeight: '100px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                }
            }),
            React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement('span', { style: { fontSize: '12px', color: '#999' } }, 
                    'Selected: ' + workflowTemplates.find(t => t.type === formData.workflowType).name
                ),
                React.createElement('button', {
                    onClick: handleExecuteWorkflow,
                    disabled: executing || !formData.description.trim(),
                    style: {
                        padding: '12px 25px',
                        backgroundColor: executing || !formData.description.trim() ? '#ccc' : '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: executing ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'all 0.3s'
                    }
                }, executing ? '⟳ Executing...' : '▶ Start Workflow')
            )
        ),

        // Workflow History
        React.createElement('div', null,
            React.createElement('h3', null, 'Execution History'),
            workflows.length === 0 && React.createElement('p', { style: { textAlign: 'center', color: '#999', padding: '30px' } }, 'No workflow executions yet. Create one to get started!'),

            workflows.map(workflow => React.createElement('div', { key: workflow.id, style: {
                backgroundColor: 'white',
                padding: '18px',
                marginBottom: '15px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderLeft: '5px solid ' + (
                    workflow.status === 'completed' ? '#10b981' :
                    workflow.status === 'failed' ? '#ef4444' : '#f59e0b'
                )
            }, onClick: () => setSelectedWorkflow(selectedWorkflow === workflow.id ? null : workflow.id) },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '15px' } },
                    React.createElement('div', { style: { flex: 1 } },
                        React.createElement('h4', { style: { margin: '0 0 8px 0', color: '#333', wordBreak: 'break-word' } }, 
                            workflow.user_request || workflow.request || 'Workflow ' + workflow.id
                        ),
                        React.createElement('p', { style: { margin: '0 0 10px 0', color: '#666', fontSize: '13px' } }, 
                            '📅 ' + new Date(workflow.created_at).toLocaleString()
                        ),
                        selectedWorkflow === workflow.id && workflow.result && React.createElement('div', { style: {
                            marginTop: '12px',
                            padding: '12px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px',
                            borderLeft: '3px solid #6366f1',
                            fontSize: '13px',
                            color: '#555',
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }},
                            React.createElement('strong', null, 'Result:'),
                            React.createElement('p', { style: { margin: '8px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, workflow.result)
                        )
                    ),
                    React.createElement('span', { style: {
                        backgroundColor: workflow.status === 'completed' ? '#dbeafe' : workflow.status === 'failed' ? '#fee2e2' : '#fef3c7',
                        color: workflow.status === 'completed' ? '#0c4a6e' : workflow.status === 'failed' ? '#991b1b' : '#92400e',
                        padding: '8px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                    }}, 
                        (workflow.status === 'completed' ? '✓' : workflow.status === 'failed' ? '✕' : '⟳') + ' ' + workflow.status
                    )
                ),
                selectedWorkflow === workflow.id && workflow.completed_at && React.createElement('p', { style: {
                    margin: '12px 0 0 0',
                    padding: '10px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#666'
                }},
                    '⏱ Completed: ' + new Date(workflow.completed_at).toLocaleString()
                )
            ))
        ),

        // How to Use
        React.createElement('div', { style: {
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #86efac'
        }},
            React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#166534' } }, '💡 How to Use Multi-Agent Workflows'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' } },
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0', fontWeight: 'bold' } }, '1️⃣ Choose a Template'),
                    React.createElement('p', { style: { margin: '0', color: '#666' } }, 'Select the workflow type that best fits your task.')
                ),
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0', fontWeight: 'bold' } }, '2️⃣ Describe Your Task'),
                    React.createElement('p', { style: { margin: '0', color: '#666' } }, 'Write a clear description of what you want accomplished.')
                ),
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0', fontWeight: 'bold' } }, '3️⃣ Execute Workflow'),
                    React.createElement('p', { style: { margin: '0', color: '#666' } }, 'Click "Start Workflow" and let AI agents coordinate.')
                ),
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0', fontWeight: 'bold' } }, '4️⃣ View Results'),
                    React.createElement('p', { style: { margin: '0', color: '#666' } }, 'Check the history to see execution status and results.')
                )
            )
        )
    );
}

// ====== AI ASSISTANT COMPONENT ======
function AIAssistant({ refreshTrigger, onRefresh }) {
    const [tasks, setTasks] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [todayPlan, setTodayPlan] = useState(null);
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [planFormData, setPlanFormData] = useState({ 
        name: '', 
        workStart: '09:00', 
        workEnd: '18:00', 
        breakDuration: '30',
        focusArea: 'balanced'
    });
    
    // NEW: Chat and Voice State
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const loadTasks = () => {
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/tasks')
            .then(res => res.json())
            .then(data => {
                setTasks(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading tasks:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadTasks();
    }, [refreshTrigger]);

    // NEW: Speech-to-Text using Web Speech API
    const startVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('❌ Speech Recognition not supported in your browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        setIsListening(true);

        recognition.onstart = () => {
            console.log('🎤 Listening...');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                setChatInput(finalTranscript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            alert('❌ Error: ' + event.error);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    // NEW: Text-to-Speech using Web Speech API
    const speakMessage = (text) => {
        if (!('speechSynthesis' in window)) {
            alert('❌ Speech Synthesis not supported in your browser');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        setIsSpeaking(true);

        utterance.onend = () => {
            setIsSpeaking(false);
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
    };

    // NEW: Send Chat Message
    const sendChatMessage = () => {
        if (!chatInput.trim()) {
            alert('Please enter a message');
            return;
        }

        const userMessage = {
            role: 'user',
            content: chatInput.trim(),
            timestamp: new Date().toLocaleTimeString()
        };

        setChatMessages([...chatMessages, userMessage]);
        setChatInput('');
        setChatLoading(true);

        // Send to backend
        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage.content })
        })
        .then(res => {
            if (!res.ok) {
                throw new Error(`API Error: ${res.status} ${res.statusText}`);
            }
            return res.json();
        })
        .then(data => {
            const assistantMessage = {
                role: 'assistant',
                content: data.assistant_response || 'No response',
                timestamp: new Date().toLocaleTimeString()
            };
            setChatMessages(prev => [...prev, assistantMessage]);
            setChatLoading(false);
        })
        .catch(err => {
            console.error('Error:', err);
            let errorMsg = '❌ Error communicating with AI.';
            if (err.message.includes('404')) {
                errorMsg = '❌ Backend not running. Check ';
            } else if (err.message.includes('Failed to fetch')) {
                errorMsg = '❌ Cannot connect to backend. Is it running on :8000?';
            } else {
                errorMsg += ' ' + err.message;
            }
            const errorMessage = {
                role: 'assistant',
                content: errorMsg,
                timestamp: new Date().toLocaleTimeString()
            };
            setChatMessages(prev => [...prev, errorMessage]);
            setChatLoading(false);
        });
    };

    const generateDailyPlan = () => {
        setAnalyzing(true);
        
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        const highPriority = pendingTasks.filter(t => t.priority === 'high');
        const mediumPriority = pendingTasks.filter(t => t.priority === 'medium');
        const lowPriority = pendingTasks.filter(t => t.priority === 'low');

        const plan = {
            morning: highPriority.slice(0, 2).map((t, i) => `${i + 1}. ${t.title}`),
            afternoon: mediumPriority.slice(0, 2).map((t, i) => `${i + 1}. ${t.title}`),
            evening: lowPriority.slice(0, 2).map((t, i) => `${i + 1}. ${t.title}`),
            total: pendingTasks.length,
            completed: tasks.filter(t => t.status === 'completed').length
        };

        setTodayPlan(plan);
        setAnalyzing(false);
        alert('✓ Daily Plan Created!\n\nYour schedule has been optimized for today.');
    };

    const handleCreatePlan = () => {
        if (!planFormData.name.trim()) {
            alert('Please enter your name');
            return;
        }

        setAnalyzing(true);
        setTimeout(() => {
            const pendingTasks = tasks.filter(t => t.status === 'pending');
            const highPriority = pendingTasks.filter(t => t.priority === 'high');
            const mediumPriority = pendingTasks.filter(t => t.priority === 'medium');
            const lowPriority = pendingTasks.filter(t => t.priority === 'low');

            const plan = {
                name: planFormData.name,
                workStart: planFormData.workStart,
                workEnd: planFormData.workEnd,
                breakDuration: planFormData.breakDuration,
                focusArea: planFormData.focusArea,
                morning: highPriority.slice(0, 2).map((t, i) => `${i + 1}. ${t.title}`),
                afternoon: mediumPriority.slice(0, 2).map((t, i) => `${i + 1}. ${t.title}`),
                evening: lowPriority.slice(0, 2).map((t, i) => `${i + 1}. ${t.title}`),
                total: pendingTasks.length,
                completed: tasks.filter(t => t.status === 'completed').length
            };

            setTodayPlan(plan);
            setShowPlanForm(false);
            setPlanFormData({ name: '', workStart: '09:00', workEnd: '18:00', breakDuration: '30', focusArea: 'balanced' });
            setAnalyzing(false);
            alert('✓ Daily Plan Created for ' + planFormData.name + '!\n\nYour personalized schedule is ready.');
        }, 1000);
    };

    const generateSuggestions = () => {
        setAnalyzing(true);
        
        // Prepare task data for AI analysis
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high');
        
        const taskSummary = {
            totalTasks: tasks.length,
            pendingTasks: pendingTasks.length,
            completedTasks: completedTasks.length,
            completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
            highPriorityCount: highPriorityTasks.length,
            tasksList: pendingTasks.slice(0, 5).map(t => `${t.title} (${t.priority})`).join(', ')
        };

        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/ai-suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                taskSummary: taskSummary,
                prompt: `Analyze these tasks and provide 3-4 specific, actionable suggestions to improve productivity and task completion. Include fixes for bottlenecks.`
            })
        })
        .then(res => res.json())
        .then(data => {
            console.log('AI Suggestions:', data);
            if (data.suggestions && data.suggestions.length > 0) {
                setSuggestions(data.suggestions);
                setAnalyzing(false);
                alert('✓ AI Analysis Complete!\n\nGenerated ' + data.suggestions.length + ' personalized suggestions & fixes.');
            } else {
                setSuggestions([
                    {
                        id: 1,
                        type: 'Productivity',
                        title: '⚡ Optimize Task Prioritization',
                        description: 'You have ' + highPriorityTasks.length + ' high-priority tasks. Consider breaking them into smaller subtasks of 1-2 hours each for better focus.',
                        fix: 'Update task descriptions with time estimates and break down complex tasks',
                        icon: '🎯'
                    },
                    {
                        id: 2,
                        type: 'Performance',
                        title: '📈 Improve Completion Rate',
                        description: 'Your current completion rate is ' + taskSummary.completionRate + '%. Aim for 80%+ by focusing on 3 tasks per day max.',
                        fix: 'Reduce daily task load and set realistic goals',
                        icon: '📊'
                    },
                    {
                        id: 3,
                        type: 'Balance',
                        title: '⚖️ Work-Life Balance',
                        description: 'Use Pomodoro technique (25min focus + 5min break) to maintain sustainable productivity without burnout.',
                        fix: 'Use the Focus Timer feature during task work sessions',
                        icon: '⏱️'
                    }
                ]);
                setAnalyzing(false);
            }
        })
        .catch(err => {
            console.error('Error generating suggestions:', err);
            // Provide default suggestions if API fails
            setSuggestions([
                {
                    id: 1,
                    type: 'Productivity',
                    title: '⚡ Quick Win Strategy',
                    description: 'Start with 2-3 small tasks to build momentum. Then tackle the harder ones.',
                    fix: 'Sort tasks by effort level and complete easy ones first',
                    icon: '🚀'
                },
                {
                    id: 2,
                    type: 'Time',
                    title: '⏰ Time Blocking',
                    description: 'Dedicate specific time blocks for different types of tasks (creative, admin, collaborative).',
                    fix: 'Use the daily planner feature to organize time blocks',
                    icon: '📅'
                }
            ]);
            setAnalyzing(false);
        });
    };

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', null, 'Loading AI Assistant...'));

    return React.createElement('div', { className: 'container' },
        React.createElement('h2', { style: { marginTop: 0 } }, '🤖 AI Life Assistant'),
        React.createElement('p', { style: { color: '#666', marginBottom: '30px' } }, 'Smart daily task planning, life optimization & interactive chat'),

        // NEW: Quick action buttons
        React.createElement('div', { style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '20px',
            marginBottom: '30px'
        }},
            React.createElement('button', {
                onClick: () => setShowChat(!showChat),
                style: {
                    padding: '20px',
                    backgroundColor: showChat ? '#10b981' : '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100px',
                    transition: 'all 0.3s'
                }
            },
                React.createElement('span', { style: { fontSize: '30px' } }, '💬'),
                React.createElement('span', null, showChat ? 'Close Chat' : 'Ask Anything')
            ),
            React.createElement('button', {
                onClick: () => setShowPlanForm(true),
                disabled: analyzing,
                style: {
                    padding: '20px',
                    backgroundColor: analyzing ? '#ccc' : '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: analyzing ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100px',
                    transition: 'all 0.3s'
                }
            },
                React.createElement('span', { style: { fontSize: '30px' } }, '📅'),
                React.createElement('span', null, analyzing ? 'Creating Plan...' : 'Create Daily Plan')
            ),
            React.createElement('button', {
                onClick: generateSuggestions,
                disabled: analyzing,
                style: {
                    padding: '20px',
                    backgroundColor: analyzing ? '#ccc' : '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: analyzing ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100px',
                    transition: 'all 0.3s'
                }
            },
                React.createElement('span', { style: { fontSize: '30px' } }, '💡'),
                React.createElement('span', null, analyzing ? 'Analyzing...' : 'Get Suggestions')
            )
        ),

        // NEW: Chat Interface
        showChat && React.createElement('div', { style: {
            backgroundColor: '#f8fafc',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #6366f1',
            marginBottom: '30px'
        }},
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                React.createElement('h3', { style: { margin: 0 } }, '💬 Interactive Chat'),
                React.createElement('button', {
                    onClick: () => {
                        setShowChat(false);
                        window.speechSynthesis.cancel();
                        setIsSpeaking(false);
                    },
                    style: { backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' }
                }, '✕')
            ),

            // Chat messages display
            React.createElement('div', { style: {
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '20px',
                height: '300px',
                overflowY: 'auto',
                marginBottom: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }},
                chatMessages.length === 0 ? React.createElement('div', { style: { color: '#999', textAlign: 'center', lineHeight: '300px' } }, 'Start a conversation...') : null,
                chatMessages.map((msg, idx) => React.createElement('div', {
                    key: idx,
                    style: {
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: msg.role === 'user' ? '#6366f1' : '#f0f4f8',
                        color: msg.role === 'user' ? 'white' : '#333',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        wordWrap: 'break-word'
                    }
                },
                    React.createElement('div', { style: { fontSize: '12px', opacity: 0.7, marginBottom: '4px' } }, msg.timestamp),
                    React.createElement('div', null, msg.content)
                ))
            ),

            // Input area
            React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '12px' } },
                React.createElement('input', {
                    type: 'text',
                    value: chatInput,
                    onChange: (e) => setChatInput(e.target.value),
                    onKeyPress: (e) => e.key === 'Enter' && sendChatMessage(),
                    placeholder: 'Ask anything or type your question...',
                    style: {
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                    }
                }),
                React.createElement('button', {
                    onClick: sendChatMessage,
                    disabled: chatLoading,
                    style: {
                        padding: '12px 20px',
                        backgroundColor: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: chatLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }
                }, chatLoading ? '⏳' : '📤')
            ),

            // Voice controls
            React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                React.createElement('button', {
                    onClick: startVoiceInput,
                    disabled: isListening || chatLoading,
                    title: 'Speak your question',
                    style: {
                        flex: 1,
                        padding: '10px',
                        backgroundColor: isListening ? '#ef4444' : '#64748b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isListening || chatLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }
                }, isListening ? '🎤 Listening...' : '🎤 Voice Input'),
                React.createElement('button', {
                    onClick: () => {
                        if (chatMessages.length > 0) {
                            const lastMessage = chatMessages[chatMessages.length - 1];
                            if (lastMessage.role === 'assistant') {
                                speakMessage(lastMessage.content);
                            }
                        } else {
                            alert('No message to speak');
                        }
                    },
                    title: 'Speak the response',
                    style: {
                        flex: 1,
                        padding: '10px',
                        backgroundColor: isSpeaking ? '#f59e0b' : '#64748b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }
                }, isSpeaking ? '🔊 Speaking...' : '🔊 Speak')
            )
        ),

        todayPlan && React.createElement('div', { style: {
            backgroundColor: '#f0f9ff',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid #0ea5e9',
            marginBottom: '30px'
        }},
            React.createElement('h3', { style: { margin: '0 0 20px 0', color: '#0369a1' } }, '📅 Today\'s AI-Optimized Plan'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' } },
                React.createElement('div', { style: { padding: '15px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' } },
                    React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#ea580c' } }, '🌅 Morning (High Priority)'),
                    todayPlan.morning.length > 0 ? React.createElement('ul', { style: { margin: '0', paddingLeft: '20px', color: '#666', fontSize: '14px' } },
                        todayPlan.morning.map((task, i) => React.createElement('li', { key: i, style: { marginBottom: '8px' } }, task))
                    ) : React.createElement('p', { style: { margin: '0', color: '#999', fontSize: '14px' } }, 'No high-priority tasks')
                ),
                React.createElement('div', { style: { padding: '15px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' } },
                    React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#059669' } }, '☀️ Afternoon (Medium Priority)'),
                    todayPlan.afternoon.length > 0 ? React.createElement('ul', { style: { margin: '0', paddingLeft: '20px', color: '#666', fontSize: '14px' } },
                        todayPlan.afternoon.map((task, i) => React.createElement('li', { key: i, style: { marginBottom: '8px' } }, task))
                    ) : React.createElement('p', { style: { margin: '0', color: '#999', fontSize: '14px' } }, 'No medium-priority tasks')
                ),
                React.createElement('div', { style: { padding: '15px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' } },
                    React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#7c3aed' } }, '🌙 Evening (Low Priority)'),
                    todayPlan.evening.length > 0 ? React.createElement('ul', { style: { margin: '0', paddingLeft: '20px', color: '#666', fontSize: '14px' } },
                        todayPlan.evening.map((task, i) => React.createElement('li', { key: i, style: { marginBottom: '8px' } }, task))
                    ) : React.createElement('p', { style: { margin: '0', color: '#999', fontSize: '14px' } }, 'No low-priority tasks')
                )
            ),
            React.createElement('div', { style: { marginTop: '20px', display: 'flex', gap: '20px', fontSize: '14px', color: '#666' } },
                React.createElement('span', null, React.createElement('strong', null, '📊 Total Tasks: '), todayPlan.total),
                React.createElement('span', null, React.createElement('strong', null, '✓ Completed: '), todayPlan.completed),
                React.createElement('span', null, React.createElement('strong', null, '⏳ Remaining: '), todayPlan.total - todayPlan.completed)
            )
        ),

        suggestions.length > 0 && React.createElement('div', { style: { marginBottom: '40px' }},
            React.createElement('h3', { style: { marginBottom: '20px', color: '#1f2937', fontSize: '20px', fontWeight: 'bold' } }, '💡 AI-Powered Suggestions & Fixes'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px' } },
                suggestions.map((suggestion, idx) => React.createElement('div', { key: suggestion.id || idx, style: {
                    backgroundColor: 'white',
                    padding: '25px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    borderLeft: '6px solid #6366f1',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    transition: 'all 0.3s'
                },
                onMouseEnter: (e) => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                },
                onMouseLeave: (e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }},
                    React.createElement('div', { style: { display: 'flex', gap: '15px', alignItems: 'flex-start' } },
                        React.createElement('span', { style: { fontSize: '36px', minWidth: '40px' } }, suggestion.icon || '💡'),
                        React.createElement('div', { style: { flex: 1 } },
                            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' } },
                                React.createElement('h4', { style: { margin: '0', fontSize: '16px', fontWeight: '700', color: '#1f2937' } }, suggestion.title),
                                React.createElement('span', { style: { backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', minWidth: 'fit-content' } }, suggestion.type)
                            ),
                            React.createElement('p', { style: { margin: '0 0 15px 0', color: '#666', fontSize: '14px', lineHeight: '1.6' } }, suggestion.description),
                            
                            // Fix Section
                            React.createElement('div', { style: { backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', padding: '15px', borderRadius: '6px', marginBottom: '15px' } },
                                React.createElement('h5', { style: { margin: '0 0 8px 0', color: '#92400e', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' } }, '🔧 Recommended Fix'),
                                React.createElement('p', { style: { margin: '0', color: '#78350f', fontSize: '13px', lineHeight: '1.6' } }, suggestion.fix || suggestion.description)
                            ),

                            React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                                React.createElement('button', {
                                    onClick: () => {
                                        setChatInput('How can I ' + suggestion.title.toLowerCase() + '? Give me step-by-step guide.');
                                        setShowChat(true);
                                    },
                                    style: {
                                        padding: '8px 16px',
                                        backgroundColor: '#6366f1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }
                                }, '💬 Ask AI for Details'),
                                React.createElement('button', {
                                    onClick: () => {
                                        alert('✓ Suggestion noted! Check the Tasks section to implement this fix.');
                                    },
                                    style: {
                                        padding: '8px 16px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }
                                }, '✓ Got It!')
                            )
                        )
                    )
                ))
            )
        ),

        React.createElement('div', { style: {
            marginTop: '40px',
            padding: '25px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            border: '2px solid #f59e0b'
        }},
            React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#92400e' } }, '🎯 How to Use AI Assistant'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' } },
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0' } }, React.createElement('strong', null, '1️⃣ Chat & Ask')),
                    React.createElement('p', { style: { margin: '0', color: '#666' } }, 'Click "Ask Anything" to chat with AI. Use voice input (🎤) for hands-free interaction.')
                ),
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0' } }, React.createElement('strong', null, '2️⃣ Voice Commands')),
                    React.createElement('p', { style: { margin: '0', color: '#666' } }, 'Click the microphone button and speak your questions. AI will respond with text and voice.')
                ),
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0' } }, React.createElement('strong', null, '3️⃣ Create Daily Plan')),
                    React.createElement('p', { style: { margin: '0', color: '#666' } }, 'Get AI-optimized schedules by priority level. Personalize your work hours and break times.')
                ),
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0' } }, React.createElement('strong', null, '4️⃣ Get AI Suggestions')),
                    React.createElement('p', { style: { margin: '0', color: '#666' } }, 'Receive personalized life advice and productivity tips based on your tasks and goals.')
                )
            ),
            React.createElement('div', { style: { marginTop: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '6px', borderLeft: '4px solid #f59e0b' } },
                React.createElement('p', { style: { margin: '0', fontSize: '13px', color: '#666' } }, 
                    '✨ Talk to your AI assistant about anything! Get planning advice, productivity tips, life guidance, and more. The more you interact, the smarter it gets!'
                )
            )
        ),

        showPlanForm && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 } },
            React.createElement('div', { style: { backgroundColor: 'white', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' } },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' } },
                    React.createElement('h2', { style: { margin: 0 } }, '📅 Create Your Daily Plan'),
                    React.createElement('button', {
                        onClick: () => {
                            setShowPlanForm(false);
                            setPlanFormData({ name: '', workStart: '09:00', workEnd: '18:00', breakDuration: '30', focusArea: 'balanced' });
                        },
                        style: { backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '0', width: '30px', height: '30px' }
                    }, '✕')
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' } }, 'Your Name *'),
                    React.createElement('input', {
                        type: 'text',
                        value: planFormData.name,
                        onChange: (e) => setPlanFormData({ ...planFormData, name: e.target.value }),
                        placeholder: 'Enter your name',
                        style: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                    })
                ),

                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' } },
                    React.createElement('div', null,
                        React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' } }, 'Work Start Time'),
                        React.createElement('input', {
                            type: 'time',
                            value: planFormData.workStart,
                            onChange: (e) => setPlanFormData({ ...planFormData, workStart: e.target.value }),
                            style: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                        })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' } }, 'Work End Time'),
                        React.createElement('input', {
                            type: 'time',
                            value: planFormData.workEnd,
                            onChange: (e) => setPlanFormData({ ...planFormData, workEnd: e.target.value }),
                            style: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                        })
                    )
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' } }, 'Break Duration (minutes)'),
                    React.createElement('input', {
                        type: 'number',
                        value: planFormData.breakDuration,
                        onChange: (e) => setPlanFormData({ ...planFormData, breakDuration: e.target.value }),
                        min: '15',
                        max: '60',
                        style: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                    })
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' } }, 'Focus Area'),
                    React.createElement('select', {
                        value: planFormData.focusArea,
                        onChange: (e) => setPlanFormData({ ...planFormData, focusArea: e.target.value }),
                        style: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                    },
                        React.createElement('option', { value: 'balanced' }, '⚖️ Balanced'),
                        React.createElement('option', { value: 'productive' }, '🚀 High Productivity'),
                        React.createElement('option', { value: 'wellness' }, '🧘 Wellness & Balance'),
                        React.createElement('option', { value: 'fitness' }, '💪 Fitness Focused')
                    )
                ),

                React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                    React.createElement('button', {
                        onClick: () => {
                            setShowPlanForm(false);
                            setPlanFormData({ name: '', workStart: '09:00', workEnd: '18:00', breakDuration: '30', focusArea: 'balanced' });
                        },
                        style: { flex: 1, padding: '10px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }
                    }, 'Cancel'),
                    React.createElement('button', {
                        onClick: handleCreatePlan,
                        style: { flex: 1, padding: '10px 20px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }
                    }, 'Create Plan')
                )
            )
        )
    );
}

// ====== HEADER COMPONENT ======
function Header() {
    return React.createElement('header', { className: 'header', style: { padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
            React.createElement('div', { style: { fontSize: '32px', fontWeight: 'bold', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', backgroundClip: 'text', color: 'transparent' } }, '🤖'),
            React.createElement('div', null,
                React.createElement('h1', { style: { margin: '0', fontSize: '22px', fontWeight: '700', color: '#1f2937', letterSpacing: '-0.5px' } }, 'AI Task Manager'),
                React.createElement('p', { style: { margin: '0', fontSize: '12px', color: '#9ca3af', fontWeight: '500' } }, 'Smart Daily Assistant')
            )
        )
    );
}

// ====== TAB NAVIGATION COMPONENT ======
function TabNav({ activeTab, onTabChange }) {
    const tabs = ['Dashboard', 'Tasks', 'Schedule', 'Notes', 'Workflow', 'AI Assistant'];
    
    return React.createElement('nav', { style: { display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff', padding: '0 20px' } },
        tabs.map(tab => React.createElement('button', {
            key: tab,
            onClick: () => onTabChange(tab),
            style: {
                padding: '14px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '13px',
                fontWeight: activeTab === tab ? '600' : '500',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                color: activeTab === tab ? '#6366f1' : '#6b7280',
                transition: 'all 0.2s',
                letterSpacing: '0.3px'
            }
        }, tab))
    );
}

// ====== MAIN APP ======
function App() {
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [filterStatus, setFilterStatus] = useState(null);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [showFloatingAI, setShowFloatingAI] = useState(false);
    const [floatingMessages, setFloatingMessages] = useState([]);
    const [floatingInput, setFloatingInput] = useState('');
    const [floatingLoading, setFloatingLoading] = useState(false);

    const handleRefresh = () => {
        setRefreshCounter(refreshCounter + 1);
    };

    const sendFloatingMessage = () => {
        if (!floatingInput.trim()) return;

        const userMsg = {
            role: 'user',
            content: floatingInput.trim(),
            timestamp: new Date().toLocaleTimeString()
        };

        setFloatingMessages([...floatingMessages, userMsg]);
        setFloatingInput('');
        setFloatingLoading(true);

        fetch('https://genai-task-manager-backend-232002352100.us-central1.run.app/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg.content })
        })
        .then(res => res.json())
        .then(data => {
            const aiMsg = {
                role: 'assistant',
                content: data.assistant_response || 'No response',
                timestamp: new Date().toLocaleTimeString()
            };
            setFloatingMessages(prev => [...prev, aiMsg]);
            setFloatingLoading(false);
        })
        .catch(err => {
            console.error('Error:', err);
            const errorMsg = {
                role: 'assistant',
                content: '❌ Error communicating with AI',
                timestamp: new Date().toLocaleTimeString()
            };
            setFloatingMessages(prev => [...prev, errorMsg]);
            setFloatingLoading(false);
        });
    };

    const handleTabChange = (tab, filter) => {
        setActiveTab(tab);
        setFilterStatus(filter || null);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return React.createElement(Dashboard, { refreshTrigger: refreshCounter, onTabChange: handleTabChange });
            case 'Tasks':
                return React.createElement(Tasks, { refreshTrigger: refreshCounter, onRefresh: handleRefresh, filterStatus: filterStatus });
            case 'Schedule':
                return React.createElement(Schedule, { refreshTrigger: refreshCounter, onRefresh: handleRefresh });
            case 'Notes':
                return React.createElement(Notes, { refreshTrigger: refreshCounter, onRefresh: handleRefresh });
            case 'Workflow':
                return React.createElement(Workflow, { refreshTrigger: refreshCounter, onRefresh: handleRefresh });
            case 'AI Assistant':
                return React.createElement(AIAssistant, { refreshTrigger: refreshCounter, onRefresh: handleRefresh });
            default:
                return React.createElement(Dashboard, { refreshTrigger: refreshCounter, onTabChange: handleTabChange });
        }
    };

    const mainBg = '#f9f9f9';
    
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: mainBg } },
        React.createElement(Header),
        React.createElement(TabNav, { activeTab: activeTab, onTabChange: (tab) => handleTabChange(tab) }),
        React.createElement('main', { style: { flex: 1, padding: '30px 20px' } },
            renderTabContent()
        ),
        // Floating AI Button
        React.createElement('button', {
            onClick: () => setShowFloatingAI(!showFloatingAI),
            style: {
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
            }
        }, '💬'),
        // Floating AI Chat Panel
        showFloatingAI && React.createElement('div', {
            style: {
                position: 'fixed',
                bottom: '100px',
                right: '30px',
                width: '350px',
                height: '500px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1000,
                border: '1px solid #e5e7eb',
                color: '#000000'
            }
        },
            React.createElement('div', { style: { padding: '15px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1f2937' } },
                'AI Assistant 🤖',
                React.createElement('button', {
                    onClick: () => setShowFloatingAI(false),
                    style: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#1f2937' }
                }, '✕')
            ),
            React.createElement('div', { style: { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' } },
                floatingMessages.length === 0 && React.createElement('p', { style: { color: '#999', fontSize: '14px' } }, 'Ask me anything about your project...'),
                floatingMessages.map((msg, idx) =>
                    React.createElement('div', {
                        key: idx,
                        style: {
                            backgroundColor: msg.role === 'user' ? '#6366f1' : '#f3f4f6',
                            color: msg.role === 'user' ? 'white' : 'black',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            wordWrap: 'break-word'
                        }
                    }, msg.content)
                ),
                floatingLoading && React.createElement('div', { style: { color: '#666', fontSize: '13px' } }, 'AI is thinking...')
            ),
            React.createElement('div', { style: { padding: '15px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' } },
                React.createElement('input', {
                    type: 'text',
                    placeholder: 'Ask something...',
                    value: floatingInput,
                    onChange: (e) => setFloatingInput(e.target.value),
                    onKeyPress: (e) => e.key === 'Enter' && sendFloatingMessage(),
                    style: {
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: 'white',
                        color: '#000000'
                    }
                }),
                React.createElement('button', {
                    onClick: sendFloatingMessage,
                    disabled: floatingLoading,
                    style: {
                        padding: '8px 12px',
                        backgroundColor: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }
                }, '→')
            )
        ),
        React.createElement('footer', { style: { borderTop: '1px solid #e5e7eb', padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', backgroundColor: '#ffffff', marginTop: '40px' } },
            React.createElement('p', { style: { margin: 0 } }, 'Multi-Agent AI Task Management System • Built with React & FastAPI')
        )
    );
}

// Initialize App
console.log('Initializing React app...');
console.log('React version:', React.version);
console.log('ReactDOM version:', typeof ReactDOM);

try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
        throw new Error('Root element not found');
    }
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));
    console.log('✓ React app rendered successfully');
} catch (error) {
    console.error('✗ Error rendering app:', error);
    const msg = error.message || 'Unknown error';
    document.getElementById('root').innerHTML = '<div style="padding:20px; color:red; fontFamily: monospace;"><h2>Error Loading App</h2><p>' + msg + '</p><p style="fontSize:12px;">' + error.stack + '</p></div>';
}

