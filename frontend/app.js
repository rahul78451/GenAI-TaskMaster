const { useState, useEffect, useRef, useMemo } = React;

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
            fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks')
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
            
            fetch('https://genai-backend-1013063132017.us-central1.run.app/api/schedule')
                .then(res => res.json())
                .then(data => {
                    eventCount = Array.isArray(data) ? data.length : 0;
                })
                .catch(err => console.error('Error loading schedule:', err)),
            
            fetch('https://genai-backend-1013063132017.us-central1.run.app/api/notes')
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks')
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks', {
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

        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks', {
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
                React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '8px', textAlign: 'center' } }, React.createElement('p', null, '📋 Total Tasks: 0')),
                React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '8px', textAlign: 'center' } }, React.createElement('p', null, '⏳ Pending: 0')),
                React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '8px', textAlign: 'center' } }, React.createElement('p', null, '✓ Completed: 0'))
            )
        );
    }

    const statCardStyle = {
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        padding: '24px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backdropFilter: 'blur(12px)'
    };

    const makeStatCard = (title, value, icon, color, onClick) => {
        return React.createElement('div', { 
            className: 'stat-card',
            onClick: onClick,
            onMouseEnter: (e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 32px rgba(0,0,0,0.5), 0 0 30px rgba(99, 102, 241, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
            },
            style: { ...statCardStyle, borderLeft: `4px solid ${color}` }
        },
            React.createElement('div', null,
                React.createElement('span', { style: { fontSize: '28px', display: 'block', marginBottom: '8px' } }, icon),
                React.createElement('h3', { style: { margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase' } }, title)
            ),
            React.createElement('p', { style: { margin: '0 0 8px 0', fontSize: '36px', fontWeight: '800', color: color, letterSpacing: '-1px' } }, value || 0),
            React.createElement('p', { style: { margin: '0', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500' } }, '▲ View details →')
        );
    };

    return React.createElement('div', { className: 'container' },
        React.createElement('div', { style: { marginBottom: '30px', padding: '16px', backgroundColor: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-subtle)' } },
            React.createElement('label', { style: { display: 'block', marginBottom: '12px', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase' } }, '🔍 SEARCH EVERYTHING'),
            React.createElement('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
                React.createElement('input', {
                    type: 'text',
                    value: searchQuery,
                    onChange: handleSearchChange,
                    placeholder: 'Search tasks, schedule, notes, workflows...',
                    style: { flex: 1, padding: '10px 14px', border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }
                }),
                searchQuery && React.createElement('button', {
                    onClick: clearSearch,
                    style: { padding: '8px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }
                }, '✕')
            )
        ),

        showSearchResults && React.createElement('div', { style: { marginBottom: '30px', padding: '20px', backgroundColor: 'rgba(56, 189, 248, 0.06)', borderRadius: '10px', border: '2px solid rgba(56, 189, 248, 0.3)' } },
            React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#38bdf8', fontSize: '15px', fontWeight: '600' } }, '🔍 Search Results (' + searchResults.length + ' found)'),
            searchResults.length === 0 ? React.createElement('p', { style: { margin: 0, color: '#a0a0b8' } }, 'No results found for "' + searchQuery + '"') : null,
            searchResults.map((result, idx) => React.createElement('div', { key: idx, style: { backgroundColor: 'rgba(20, 20, 32, 0.75)', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' } },
                React.createElement('div', { style: { display: 'flex', gap: '12px', alignItems: 'start' } },
                    React.createElement('span', { style: { fontSize: '20px', flexShrink: 0 } }, result.icon),
                    React.createElement('div', { style: { flex: 1 } },
                        React.createElement('h4', { style: { margin: '0 0 5px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, result.type + ': ' + result.title),
                        result.description && React.createElement('p', { style: { margin: '0 0 8px 0', color: '#a0a0b8', fontSize: '13px' } }, result.description),
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
                React.createElement('h2', { style: { margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '24px', fontWeight: '700' } }, '📊 Dashboard'),
                React.createElement('p', { style: { margin: '0', color: 'var(--text-tertiary)', fontSize: '13px' } }, 'Overview of your productivity')
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
            React.createElement('div', { className: 'dashboard-card', style: { backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', backdropFilter: 'blur(12px)' } },
                React.createElement('h3', { style: { margin: '0 0 15px 0', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' } }, '🎯 TODAY\'s FOCUS'),
                topTasks.length === 0 ? 
                    React.createElement('p', { style: { margin: '0', color: 'var(--text-tertiary)', fontSize: '13px' } }, 'No pending tasks for today. Great job!') :
                    React.createElement('div', null,
                        topTasks.map((task, idx) => React.createElement('div', { key: task.id, className: 'focus-item', style: { padding: '12px', background: 'var(--bg-glass)', borderLeft: '4px solid #667eea', borderRadius: '6px', marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center' } },
                            React.createElement('span', { className: 'focus-number', style: { fontWeight: '700', fontSize: '18px', color: '#667eea', lineHeight: '1', minWidth: '24px' } }, idx + 1),
                            React.createElement('div', { style: { flex: 1 } },
                                React.createElement('p', { style: { margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' } }, task.title),
                                React.createElement('p', { style: { margin: '0', color: 'var(--text-tertiary)', fontSize: '11px' } }, task.priority + ' priority')
                            )
                        ))
                    )
            ),
            
            // Pomodoro Timer (Right)
            React.createElement('div', { className: 'dashboard-card', style: { backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', backdropFilter: 'blur(12px)' } },
                React.createElement('h3', { style: { margin: '0 0 15px 0', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' } }, '⏱️ FOCUS TIMER'),
                React.createElement('div', { style: { textAlign: 'center' } },
                    React.createElement('div', { className: 'timer-display', style: { fontFamily: '\'Courier New\', monospace', fontSize: '48px', fontWeight: '700', textAlign: 'center', color: focusMode === 'pomodoro' ? '#ef4444' : '#10b981', margin: '20px 0', letterSpacing: '2px' } }, 
                        String(timerMinutes).padStart(2, '0') + ':' + String(timerSeconds).padStart(2, '0')
                    ),
                    React.createElement('p', { style: { margin: '0 0 15px 0', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' } }, focusMode === 'pomodoro' ? 'Focus Time' : 'Break Time'),
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
        React.createElement('div', { className: 'dashboard-card', style: { backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)', marginBottom: '30px', boxShadow: 'var(--shadow-sm)', backdropFilter: 'blur(12px)' } },
            React.createElement('h3', { style: { margin: '0 0 15px 0', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' } }, '⭐ TODAY\'S PRODUCTIVITY'),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '20px' } },
                React.createElement('div', { style: { textAlign: 'center' } },
                    React.createElement('div', { style: { width: '80px', height: '80px', borderRadius: '50%', background: `conic-gradient(#10b981 0deg ${(dailyScore / 100) * 360}deg, var(--border-subtle) ${(dailyScore / 100) * 360}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                        React.createElement('div', { style: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' } },
                            React.createElement('div', { style: { fontSize: '24px', fontWeight: '700', color: '#10b981' } }, Math.round(dailyScore) + '%'),
                            React.createElement('div', { style: { fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' } }, 'Complete')
                        )
                    )
                ),
                React.createElement('div', { style: { flex: 1 } },
                    React.createElement('div', { style: { marginBottom: '12px' } },
                        React.createElement('p', { style: { margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' } }, 'Tasks Completed: ' + stats.completed_tasks + '/' + stats.total_tasks),
                        React.createElement('div', { style: { width: '100%', height: '6px', backgroundColor: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' } },
                            React.createElement('div', { style: { width: (stats.total_tasks > 0 ? (stats.completed_tasks / stats.total_tasks * 100) : 0) + '%', height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s ease' } })
                        )
                    ),
                    React.createElement('p', { style: { margin: '0', fontSize: '12px', color: 'var(--text-tertiary)' } }, '🔥 ' + streak + ' day streak - Keep it up!')
                )
            )
        ),

        React.createElement('div', { style: {
            marginTop: '40px',
            padding: '24px',
            backgroundColor: 'var(--bg-glass)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)'
        }},
            React.createElement('h3', { style: { margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' } }, '🎓 GETTING STARTED'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' } },
                React.createElement('div', { style: { padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' } },
                    React.createElement('span', { style: { fontSize: '18px', display: 'block', marginBottom: '6px' } }, '📝'),
                    React.createElement('strong', { style: { color: 'var(--text-primary)' } }, 'Create Tasks'),
                    React.createElement('p', { style: { margin: '6px 0 0 0', color: 'var(--text-secondary)' } }, 'Add tasks with title, description, and priority levels.')
                ),
                React.createElement('div', { style: { padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' } },
                    React.createElement('span', { style: { fontSize: '18px', display: 'block', marginBottom: '6px' } }, '📅'),
                    React.createElement('strong', { style: { color: 'var(--text-primary)' } }, 'Schedule Events'),
                    React.createElement('p', { style: { margin: '6px 0 0 0', color: 'var(--text-secondary)' } }, 'Plan your calendar and manage all your events.')
                ),
                React.createElement('div', { style: { padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' } },
                    React.createElement('span', { style: { fontSize: '18px', display: 'block', marginBottom: '6px' } }, '📝'),
                    React.createElement('strong', { style: { color: 'var(--text-primary)' } }, 'Take Notes'),
                    React.createElement('p', { style: { margin: '6px 0 0 0', color: 'var(--text-secondary)' } }, 'Capture ideas and important information.')
                ),
                React.createElement('div', { style: { padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' } },
                    React.createElement('span', { style: { fontSize: '18px', display: 'block', marginBottom: '6px' } }, '🤖'),
                    React.createElement('strong', { style: { color: 'var(--text-primary)' } }, 'Use AI Workflows'),
                    React.createElement('p', { style: { margin: '6px 0 0 0', color: 'var(--text-secondary)' } }, 'Automate complex tasks with AI.')
                )
            )
        ),

        showCreateForm && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 } },
            React.createElement('div', { style: { backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '16px', padding: '30px', maxWidth: '500px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(99,102,241,0.1)' } },
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
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#f0f0f5' } }, 'Task Title *'),
                    React.createElement('input', {
                        type: 'text',
                        value: formData.title,
                        onChange: (e) => setFormData({ ...formData, title: e.target.value }),
                        placeholder: 'What needs to be done?',
                        style: { width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                    })
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#f0f0f5' } }, 'Description'),
                    React.createElement('textarea', {
                        value: formData.description,
                        onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                        placeholder: 'Add task details (optional)',
                        style: { width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }
                    })
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#f0f0f5' } }, 'Priority'),
                    React.createElement('select', {
                        value: formData.priority,
                        onChange: (e) => setFormData({ ...formData, priority: e.target.value }),
                        style: { width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                    },
                        React.createElement('option', { value: 'low' }, '🟢 Low'),
                        React.createElement('option', { value: 'medium' }, '🟡 Medium'),
                        React.createElement('option', { value: 'high' }, '🔴 High')
                    )
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#f0f0f5', fontSize: '13px' } }, '💡 Quick Suggestions:'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '🏃 Morning Exercise', description: 'Do 30 mins of cardio or stretching', priority: 'high' }),
                            style: { padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '🏃 Morning Exercise'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '📧 Check Emails', description: 'Review and respond to important emails', priority: 'high' }),
                            style: { padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '📧 Check Emails'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '🛒 Grocery Shopping', description: 'Buy weekly groceries and essentials', priority: 'medium' }),
                            style: { padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '🛒 Shopping'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '👥 Team Meeting', description: 'Attend scheduled team standup', priority: 'high' }),
                            style: { padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '👥 Team Meeting'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '💰 Budget Review', description: 'Review monthly budget and spending', priority: 'medium' }),
                            style: { padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '💰 Budget'),
                        React.createElement('button', {
                            onClick: () => setFormData({ ...formData, title: '🧹 Clean Room', description: 'Organize and clean your workspace', priority: 'low' }),
                            style: { padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s' }
                        }, '🧹 Clean')
                    )
                ),

                React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                    React.createElement('button', {
                        onClick: () => {
                            setShowCreateForm(false);
                            setFormData({ title: '', description: '', priority: 'medium' });
                        },
                        style: { flex: 1, padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#f0f0f5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks')
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks', {
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks', {
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks/' + taskId, {
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks/' + editingId, {
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
            fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks/' + taskId, { method: 'DELETE' })
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
                backgroundColor: 'rgba(20, 20, 32, 0.5)',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
            }},
                React.createElement('h3', { style: { margin: '0 0 20px 0' } }, '⚡ Quick Templates'),
                React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' } },
                    categories.map(cat => React.createElement('button', {
                        key: cat,
                        onClick: () => setSelectedCategory(cat),
                        style: {
                            padding: '8px 12px',
                            backgroundColor: selectedCategory === cat ? '#4f46e5' : 'rgba(255,255,255,0.06)',
                            color: selectedCategory === cat ? 'white' : '#a0a0b8',
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
                            backgroundColor: 'rgba(20, 20, 32, 0.75)',
                            border: '1px solid rgba(255,255,255,0.1)',
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
                backgroundColor: 'rgba(20, 20, 32, 0.5)',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
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
                        border: '1px solid rgba(255,255,255,0.1)',
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
                        border: '1px solid rgba(255,255,255,0.1)',
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
                        border: '1px solid rgba(255,255,255,0.1)',
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
                        border: '1px solid rgba(255,255,255,0.1)',
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
                    backgroundColor: activeFilter === null ? '#4f46e5' : 'rgba(255,255,255,0.06)',
                    color: activeFilter === null ? 'white' : '#a0a0b8',
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
                    backgroundColor: activeFilter === 'pending' ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                    color: activeFilter === 'pending' ? 'white' : '#a0a0b8',
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
                    backgroundColor: activeFilter === 'completed' ? '#10b981' : 'rgba(255,255,255,0.06)',
                    color: activeFilter === 'completed' ? 'white' : '#a0a0b8',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            }, '✓ Completed')
        ),

        filteredTasks.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px', color: '#6b6b80' } },
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
                backgroundColor: 'rgba(20, 20, 32, 0.75)',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.1)',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
            }},
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                    React.createElement('h2', { style: { margin: '0', color: '#f0f0f5', fontSize: '20px', fontWeight: '700' } }, '✏️ Edit Task'),
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
                            color: '#6b6b80'
                        }
                    }, '✕')
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Task Title *'),
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
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                        }
                    }),
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Description'),
                    React.createElement('textarea', {
                        placeholder: 'Description (optional)',
                        value: formData.description,
                        onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                        style: {
                            display: 'block',
                            width: '100%',
                            padding: '10px',
                            marginBottom: '15px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            fontSize: '14px',
                            minHeight: '80px',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                        }
                    }),
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Priority'),
                    React.createElement('select', {
                        value: formData.priority,
                        onChange: (e) => setFormData({ ...formData, priority: e.target.value }),
                        style: {
                            display: 'block',
                            width: '100%',
                            padding: '10px',
                            marginBottom: '20px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            backgroundColor: 'rgba(20, 20, 32, 0.75)'
                        }
                    },
                        React.createElement('option', { value: 'low' }, '🟢 Low Priority'),
                        React.createElement('option', { value: 'medium' }, '🟡 Medium Priority'),
                        React.createElement('option', { value: 'high' }, '🔴 High Priority')
                    ),

                    // Focus Timer Section
                    React.createElement('div', { style: { 
                        backgroundColor: 'rgba(251, 191, 36, 0.12)',
                        border: '2px solid #fbbf24',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '20px'
                    }},
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' } },
                            React.createElement('label', { style: { fontWeight: '700', color: '#fbbf24', fontSize: '14px', margin: '0' } }, '⏱️ Focus Timer'),
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
                                        backgroundColor: taskTimerActive ? 'rgba(255,255,255,0.08)' : '#ef4444',
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
                                    backgroundColor: 'rgba(20, 20, 32, 0.75)',
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#f0f0f5',
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
                                        backgroundColor: taskTimerActive ? 'rgba(255,255,255,0.08)' : '#10b981',
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
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                color: '#f0f0f5',
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
            backgroundColor: 'rgba(20, 20, 32, 0.75)',
            padding: '18px',
            marginBottom: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            borderLeft: '4px solid #3b82f6',
            animation: 'slideUp 0.4s ease-out backwards',
            animationDelay: `${idx * 0.08}s`,
            transition: 'all 0.2s'
        },
        onMouseEnter: (e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.1)';
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
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#3b82f6',
                        transition: 'all 0.2s'
                    }
                }, expandedTasks[task.id] ? '▼ Collapse' : '▶ Expand'),
                React.createElement('h3', { style: { margin: '0', flex: 1, color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, task.title),
                React.createElement('span', { style: { backgroundColor: task.priority === 'high' ? '#fee2e2' : task.priority === 'medium' ? '#fef3c7' : '#dcfce7', color: task.priority === 'high' ? '#991b1b' : task.priority === 'medium' ? '#92400e' : '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' } }, task.priority)
            ),
            
            // Expanded content
            expandedTasks[task.id] && React.createElement('div', { style: { 
                backgroundColor: 'rgba(20, 20, 32, 0.5)',
                padding: '12px',
                borderRadius: '4px',
                borderLeft: '4px solid #3b82f6'
            }},
                task.description && React.createElement('p', { style: { margin: '0 0 10px 0', color: '#a0a0b8', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, task.description),
                React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '11px' } }, '📊 Status: ' + (task.status === 'completed' ? '✓ Completed' : '⏳ Pending'))
            ),
            
            // Collapsed preview
            !expandedTasks[task.id] && task.description && React.createElement('p', { style: { margin: '0 0 8px 0', color: '#a0a0b8', fontSize: '13px', maxHeight: '80px', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' } }, task.description.substring(0, 150) + (task.description.length > 150 ? '...' : '')),
            
            // Action buttons
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
                task.status !== 'completed' && React.createElement('button', {
                    onClick: () => handleCompleteTask(task.id),
                    style: {
                        padding: '8px 12px',
                        backgroundColor: 'rgba(52, 211, 153, 0.12)',
                        color: '#34d399',
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
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
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
                        backgroundColor: 'rgba(248, 113, 113, 0.12)',
                        color: '#f87171',
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/schedule')
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/schedule', {
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/schedule/' + editingId, {
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
            fetch('https://genai-backend-1013063132017.us-central1.run.app/api/schedule/' + eventId, { method: 'DELETE' })
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
            case 'completed': return { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', badge: '✓' };
            case 'important': return { bg: 'rgba(248, 113, 113, 0.12)', text: '#f87171', badge: '⚠️' };
            default: return { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', badge: '📅' };
        }
    };

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'high': return { bg: 'rgba(248, 113, 113, 0.12)', text: '#f87171', label: '🔴 High', border: '#f87171' };
            case 'medium': return { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24', label: '🟡 Medium', border: '#fbbf24' };
            case 'low': return { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', label: '🟢 Low', border: '#34d399' };
            default: return { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24', label: '🟡 Medium', border: '#fbbf24' };
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

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', { style: { textAlign: 'center', color: '#6b6b80' } }, 'Loading calendar...'));

    return React.createElement('div', { className: 'container' },
        // Header
        React.createElement('div', { style: { marginBottom: '30px' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                React.createElement('div', null,
                    React.createElement('h2', { style: { margin: '0 0 8px 0', color: '#f0f0f5', fontSize: '24px', fontWeight: '700' } }, '📅 Schedule'),
                    React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '13px' } }, 'Manage and organize your events')
                ),
                React.createElement('button', { onClick: () => { setShowForm(!showForm); if (showForm) resetForm(); }, style: { padding: '10px 18px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' } }, showForm ? '✕ Cancel' : '➕ New Event')
            ),

            React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#f0f0f5', fontSize: '13px', fontWeight: '600' } }, 'Filter by Status:'),
            React.createElement('div', { style: { display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '15px', flexWrap: 'wrap' } },
                React.createElement('button', { onClick: () => setFilterStatus('all'), style: { padding: '6px 14px', backgroundColor: filterStatus === 'all' ? '#8b5cf6' : 'rgba(255,255,255,0.06)', color: filterStatus === 'all' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, 'All Events'),
                React.createElement('button', { onClick: () => setFilterStatus('upcoming'), style: { padding: '6px 14px', backgroundColor: filterStatus === 'upcoming' ? '#8b5cf6' : 'rgba(255,255,255,0.06)', color: filterStatus === 'upcoming' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '📅 Upcoming'),
                React.createElement('button', { onClick: () => setFilterStatus('important'), style: { padding: '6px 14px', backgroundColor: filterStatus === 'important' ? '#8b5cf6' : 'rgba(255,255,255,0.06)', color: filterStatus === 'important' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '⚠️ Important'),
                React.createElement('button', { onClick: () => setFilterStatus('completed'), style: { padding: '6px 14px', backgroundColor: filterStatus === 'completed' ? '#8b5cf6' : 'rgba(255,255,255,0.06)', color: filterStatus === 'completed' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '✓ Completed')
            ),

            React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#f0f0f5', fontSize: '13px', fontWeight: '600' } }, 'Filter by Priority:'),
            React.createElement('div', { style: { display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px', flexWrap: 'wrap' } },
                React.createElement('button', { onClick: () => setFilterPriority('all'), style: { padding: '6px 14px', backgroundColor: filterPriority === 'all' ? '#8b5cf6' : 'rgba(255,255,255,0.06)', color: filterPriority === 'all' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, 'All Priorities'),
                React.createElement('button', { onClick: () => setFilterPriority('high'), style: { padding: '6px 14px', backgroundColor: filterPriority === 'high' ? '#dc2626' : 'rgba(255,255,255,0.06)', color: filterPriority === 'high' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '🔴 High'),
                React.createElement('button', { onClick: () => setFilterPriority('medium'), style: { padding: '6px 14px', backgroundColor: filterPriority === 'medium' ? '#ea580c' : 'rgba(255,255,255,0.06)', color: filterPriority === 'medium' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '🟡 Medium'),
                React.createElement('button', { onClick: () => setFilterPriority('low'), style: { padding: '6px 14px', backgroundColor: filterPriority === 'low' ? '#16a34a' : 'rgba(255,255,255,0.06)', color: filterPriority === 'low' ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' } }, '🟢 Low')
            )
        ),

        // Create/Edit Event Form
        showForm && React.createElement('div', { style: { backgroundColor: 'rgba(99, 102, 241, 0.08)', padding: '24px', borderRadius: '12px', marginBottom: '30px', border: '2px solid #8b5cf6' } },
            React.createElement('h3', { style: { margin: '0 0 20px 0', color: '#f0f0f5', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' } }, editingId ? '✏️ Edit Event' : '✨ Create New Event'),
            React.createElement('div', { style: { marginBottom: '15px' } },
                React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Event Title *'),
                React.createElement('input', { type: 'text', placeholder: 'e.g., Team Meeting', value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' } })
            ),
            React.createElement('div', { style: { marginBottom: '15px' } },
                React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Description'),
                React.createElement('textarea', { placeholder: 'Add event details...', value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px', resize: 'vertical' } })
            ),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' } },
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Date *'),
                    React.createElement('input', { type: 'date', value: formData.date, onChange: (e) => setFormData({ ...formData, date: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' } })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Time'),
                    React.createElement('input', { type: 'time', value: formData.time, onChange: (e) => setFormData({ ...formData, time: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' } })
                )
            ),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' } },
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Priority'),
                    React.createElement('select', { value: formData.priority, onChange: (e) => setFormData({ ...formData, priority: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'rgba(20, 20, 32, 0.75)' } },
                        React.createElement('option', { value: 'low' }, '🟢 Low'),
                        React.createElement('option', { value: 'medium' }, '🟡 Medium'),
                        React.createElement('option', { value: 'high' }, '🔴 High')
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Status'),
                    React.createElement('select', { value: formData.status, onChange: (e) => setFormData({ ...formData, status: e.target.value }), style: { width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'rgba(20, 20, 32, 0.75)' } },
                        React.createElement('option', { value: 'upcoming' }, '📅 Upcoming'),
                        React.createElement('option', { value: 'important' }, '⚠️ Important'),
                        React.createElement('option', { value: 'completed' }, '✓ Completed')
                    )
                )
            ),
            React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                React.createElement('button', { onClick: resetForm, style: { flex: 1, padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#f0f0f5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' } }, 'Cancel'),
                React.createElement('button', { onClick: editingId ? handleUpdateEvent : handleCreateEvent, style: { flex: 1, padding: '10px 20px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' } }, editingId ? 'Update Event' : 'Create Event')
            )
        ),

        // Events List
        filteredEvents.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.1)' } },
            React.createElement('p', { style: { fontSize: '32px', margin: '0 0 10px 0' } }, '📅'),
            React.createElement('h3', { style: { margin: '0 0 8px 0', color: '#a0a0b8' } }, 'No events scheduled'),
            React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '13px' } }, 'Create an event to get started!')
        ),

        // Grouped Events
        sortedDates.map(date => React.createElement('div', { key: date, style: { marginBottom: '30px' } },
            React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '2px solid #8b5cf6', paddingBottom: '10px' } }, '📆 ' + date),
            
            groupedEvents[date].map((event, idx) => {
                const statusColor = getStatusColor(event.status || 'upcoming');
                const priorityColor = getPriorityColor(event.priority || 'medium');
                const eventDate = new Date(event.event_time);
                const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                return React.createElement('div', { key: event.id, style: { backgroundColor: 'rgba(20, 20, 32, 0.75)', padding: '16px', marginBottom: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid ' + priorityColor.border, display: 'flex', flexDirection: 'column', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', cursor: 'pointer', animation: 'slideUp 0.4s ease-out backwards', animationDelay: idx * 0.08 + 's' }, onMouseEnter: (e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }, onMouseLeave: (e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; } },
                    // Top section - Content with priority on right
                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' } },
                        React.createElement('div', { style: { flex: 1 } },
                            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
                                React.createElement('span', { style: { fontSize: '18px' } }, statusColor.badge),
                                React.createElement('h4', { style: { margin: '0', color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, event.title),
                                React.createElement('span', { style: { backgroundColor: statusColor.bg, color: statusColor.text, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize' } }, event.status || 'upcoming')
                            ),
                            React.createElement('p', { style: { margin: '0 0 6px 0', color: '#6b6b80', fontSize: '12px' } }, '⏰ ' + timeStr),
                            event.description && React.createElement('p', { style: { margin: '0', color: '#a0a0b8', fontSize: '13px', lineHeight: '1.4' } }, event.description)
                        ),
                        // Right side - Priority
                        React.createElement('div', { style: { display: 'flex', flexShrink: 0, marginLeft: '12px' } },
                            React.createElement('span', { style: { backgroundColor: priorityColor.bg, color: priorityColor.text, padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' } }, priorityColor.label)
                        )
                    ),
                    // Bottom section - Buttons on left
                    React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                        React.createElement('button', { onClick: () => { handleEditEvent(event); setShowForm(true); }, style: { padding: '6px 10px', backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap' }, onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)'; }, onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.12)'; } }, '✏️ Edit'),
                        React.createElement('button', { onClick: () => handleDeleteEvent(event.id), style: { padding: '6px 10px', backgroundColor: 'rgba(248, 113, 113, 0.12)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap' }, onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.2)'; }, onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.12)'; } }, '✕ Delete')
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/notes')
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/notes', {
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/notes/' + editingId, {
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
            fetch('https://genai-backend-1013063132017.us-central1.run.app/api/notes/' + noteId, { method: 'DELETE' })
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

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', { style: { textAlign: 'center', color: '#6b6b80' } }, 'Loading notes...'));

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
                backgroundColor: 'rgba(20, 20, 32, 0.75)',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.1)',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
            }},
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                    React.createElement('h2', { style: { margin: '0', color: '#f0f0f5', fontSize: '20px', fontWeight: '700' } }, '✏️ Edit Note'),
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
                            color: '#6b6b80'
                        }
                    }, '✕')
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Note Title *'),
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'e.g., Project Ideas',
                        value: formData.title,
                        onChange: (e) => setFormData({ ...formData, title: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            marginBottom: '15px'
                        }
                    }),
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Category'),
                    React.createElement('select', {
                        value: formData.category,
                        onChange: (e) => setFormData({ ...formData, category: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            backgroundColor: 'rgba(20, 20, 32, 0.75)',
                            marginBottom: '15px'
                        }
                    },
                        categories.map(cat => React.createElement('option', { key: cat, value: cat }, cat.charAt(0).toUpperCase() + cat.slice(1)))
                    ),
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Content *'),
                    React.createElement('textarea', {
                        placeholder: 'Write your note here...',
                        value: formData.content,
                        onChange: (e) => setFormData({ ...formData, content: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
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
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                color: '#f0f0f5',
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
                    React.createElement('h2', { style: { margin: '0 0 8px 0', color: '#f0f0f5', fontSize: '24px', fontWeight: '700' } }, '📝 Notes'),
                    React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '13px' } }, 'Capture ideas and important information')
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
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                    }
                })
            ),

            // Category filters
            React.createElement('div', { style: { display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' } },
                React.createElement('button', {
                    onClick: () => setFilterCategory('all'),
                    style: {
                        padding: '6px 14px',
                        backgroundColor: filterCategory === 'all' ? '#06b6d4' : 'rgba(255,255,255,0.06)',
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
                        backgroundColor: filterCategory === cat ? categoryColors[cat] : 'rgba(255,255,255,0.06)',
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
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '2px solid #06b6d4'
        }},
            React.createElement('h3', { style: { margin: '0 0 20px 0', color: '#f0f0f5', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' } }, '✨ Create New Note'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' } },
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Note Title *'),
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'e.g., Project Ideas',
                        value: formData.title,
                        onChange: (e) => setFormData({ ...formData, title: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                        }
                    })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Category'),
                    React.createElement('select', {
                        value: formData.category,
                        onChange: (e) => setFormData({ ...formData, category: e.target.value }),
                        style: {
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            backgroundColor: 'rgba(20, 20, 32, 0.75)'
                        }
                    },
                        categories.map(cat => React.createElement('option', { key: cat, value: cat }, cat.charAt(0).toUpperCase() + cat.slice(1)))
                    )
                )
            ),
            React.createElement('div', { style: { marginBottom: '15px' } },
                React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f0f0f5', fontSize: '13px' } }, 'Content *'),
                React.createElement('textarea', {
                    placeholder: 'Write your note here...',
                    value: formData.content,
                    onChange: (e) => setFormData({ ...formData, content: e.target.value }),
                    style: {
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
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
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        color: '#f0f0f5',
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
        filteredNotes.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.1)' } },
            React.createElement('p', { style: { fontSize: '32px', margin: '0 0 10px 0' } }, '📝'),
            React.createElement('h3', { style: { margin: '0 0 8px 0', color: '#a0a0b8' } }, 'No notes found'),
            React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '13px' } }, searchQuery ? 'Try a different search query' : 'Create a note to get started!')
        ),

        filteredNotes.map((note, idx) => React.createElement('div', { key: note.id, style: {
            backgroundColor: 'rgba(20, 20, 32, 0.75)',
            padding: '18px',
            marginBottom: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            borderLeft: '4px solid ' + (categoryColors[note.category] || '#06b6d4'),
            animation: 'slideUp 0.4s ease-out backwards',
            animationDelay: `${idx * 0.08}s`,
            transition: 'all 0.2s'
        },
        onMouseEnter: (e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.1)';
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
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#06b6d4',
                        transition: 'all 0.2s'
                    }
                }, expandedNotes[note.id] ? '▼ Collapse' : '▶ Expand'),
                React.createElement('h3', { style: { margin: '0', flex: 1, color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, note.title),
                React.createElement('span', { style: { backgroundColor: categoryColors[note.category] || '#06b6d4', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' } }, note.category || 'general')
            ),
            
            // Expanded content
            expandedNotes[note.id] && React.createElement('div', { style: {
                backgroundColor: 'rgba(20, 20, 32, 0.5)',
                padding: '12px',
                borderRadius: '4px',
                borderLeft: '4px solid ' + (categoryColors[note.category] || '#06b6d4')
            }},
                React.createElement('p', { style: { margin: '0 0 8px 0', color: '#a0a0b8', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, note.content),
                React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '11px' } }, '📅 ' + new Date(note.created_at).toLocaleDateString() + ' at ' + new Date(note.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
            ),
            
            // Collapsed preview
            !expandedNotes[note.id] && React.createElement('p', { style: { margin: '0 0 8px 0', color: '#a0a0b8', fontSize: '13px', maxHeight: '80px', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' } }, note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '')),
            
            // Action buttons
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
                React.createElement('button', {
                    onClick: () => handleEditNote(note),
                    style: {
                        padding: '8px 12px',
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
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
                        backgroundColor: 'rgba(248, 113, 113, 0.12)',
                        color: '#f87171',
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

// ====== WORKFLOW COMPONENT (TASK AUTOMATION BUILDER) ======
function Workflow({ refreshTrigger, onRefresh }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [formData, setFormData] = useState({ description: '', workflowType: 'general' });
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeView, setActiveView] = useState('builder'); // 'builder' | 'history' | 'ai'
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingNode, setEditingNode] = useState(null); // 'trigger' | 'condition' | 'action' | 'schedule'
    const [automations, setAutomations] = useState([]);
    const [currentAutomation, setCurrentAutomation] = useState({
        id: null, name: '', enabled: true,
        trigger: { type: 'time', value: '09:00', label: 'Every day at 9:00 AM' },
        condition: { type: 'tasks_pending', operator: '>', value: '0', label: 'If pending tasks > 0' },
        action: { type: 'notification', value: 'Complete your pending tasks!', label: 'Send notification reminder' },
        schedule: { type: 'daily', value: '1', label: 'Repeat daily' }
    });



    const presetAutomations = [
        { name: '🌅 Morning Task Reminder', trigger: { type: 'time', value: '09:00', label: 'Every day at 9:00 AM' }, condition: { type: 'tasks_pending', operator: '>', value: '0', label: 'If pending tasks > 0' }, action: { type: 'notification', value: 'Start your day! You have pending tasks.', label: 'Send morning reminder' }, schedule: { type: 'daily', value: '1', label: 'Repeat daily' } },
        { name: '🤖 AI Urgency Triage', trigger: { type: 'event', value: 'task_created', label: 'When a new task is created' }, condition: { type: 'ai_urgency', operator: '==', value: 'high', label: 'AI Detects High Urgency' }, action: { type: 'slack_msg', value: '#urgent-tasks', label: 'Alert Slack Channel' }, schedule: { type: 'instant', value: '0', label: 'Execute immediately' } },
        { name: '📊 Weekly Review', trigger: { type: 'time', value: '18:00', label: 'Every Friday at 6:00 PM' }, condition: { type: 'always', operator: '==', value: 'true', label: 'Always execute' }, action: { type: 'create_task', value: 'Weekly productivity review', label: 'Create review task' }, schedule: { type: 'weekly', value: 'friday', label: 'Repeat weekly (Friday)' } },
        { name: '🔴 High Priority Alert', trigger: { type: 'event', value: 'task_created', label: 'When a new task is created' }, condition: { type: 'priority_high', operator: '==', value: 'high', label: 'If priority is High' }, action: { type: 'notification', value: '🚨 High priority task needs attention!', label: 'Send urgent alert' }, schedule: { type: 'instant', value: '0', label: 'Execute immediately' } },
        { name: '🧹 End-of-Day Cleanup', trigger: { type: 'time', value: '21:00', label: 'Every day at 9:00 PM' }, condition: { type: 'tasks_pending', operator: '>', value: '3', label: 'If pending tasks > 3' }, action: { type: 'ai_summarize', value: 'End of day summary', label: 'AI Summarize remaining work' }, schedule: { type: 'daily', value: '1', label: 'Repeat daily' } }
    ];

    const triggerOptions = [
        { type: 'time', label: '⏰ Time-based', desc: 'Run at a specific time' },
        { type: 'event', label: '🔔 Event-based', desc: 'Run when a task is created/updated' },
        { type: 'interval', label: '🔄 Interval', desc: 'Run every X minutes/hours' },
        { type: 'webhook', label: '🪝 Webhook', desc: 'Trigger from external app (Zapier/GitHub)' },
        { type: 'ai_anomaly', label: '🤖 AI Anomaly', desc: 'Trigger if AI detects unusual activity' }
    ];
    const conditionOptions = [
        { type: 'tasks_pending', label: '📋 Tasks Pending', desc: 'Check pending task count' },
        { type: 'priority_high', label: '🔴 High Priority Exists', desc: 'Check for high priority items' },
        { type: 'ai_urgency', label: '🧠 AI Urgency Check', desc: 'AI analyzes text for implicit urgency' },
        { type: 'ai_context', label: '🎯 Smart Context', desc: 'AI checks if condition matches context' },
        { type: 'always', label: '✅ Always', desc: 'No condition, always execute' }
    ];
    const actionOptions = [
        { type: 'notification', label: '🔔 Send Notification', desc: 'Show a reminder alert' },
        { type: 'create_task', label: '📝 Create Task', desc: 'Auto-create a new task' },
        { type: 'email', label: '📧 Send Email', desc: 'Send an email summary' },
        { type: 'slack_msg', label: '💬 Send to Slack/Discord', desc: 'Post message to a channel' },
        { type: 'ai_summarize', label: '✨ AI Summarize', desc: 'Generate AI summary of pending work' },
        { type: 'ai_auto_reply', label: '🤖 AI Auto-Draft', desc: 'Draft response or next steps using AI' },
        { type: 'http_request', label: '🌐 HTTP Request', desc: 'Call external API (GET/POST)' }
    ];
    const scheduleOptions = [
        { type: 'instant', label: '⚡ Instant', desc: 'Execute once immediately' },
        { type: 'daily', label: '📅 Daily', desc: 'Repeat every day' },
        { type: 'weekly', label: '📆 Weekly', desc: 'Repeat every week' },
        { type: 'custom', label: '⚙️ Custom Cron', desc: 'Advanced cron schedule' },
        { type: 'smart_delay', label: '🧠 Smart Delay', desc: 'AI waits for optimal time' }
    ];

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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/workflow/history/all')
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

    const loadAutomations = () => {
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/automations')
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) setAutomations(data);
            })
            .catch(err => console.error('Error loading automations:', err));
    };

    useEffect(() => {
        loadWorkflows();
        loadAutomations();
    }, [refreshTrigger]);

    const handleExecuteWorkflow = () => {
        if (!formData.description.trim()) {
            alert('Please describe what you want the AI to accomplish');
            return;
        }

        setExecuting(true);
        const fullRequest = `[${formData.workflowType.toUpperCase()}] ${formData.description}`;
        
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/workflow', {
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

    const handleSaveAutomation = () => {
        if (!currentAutomation.name.trim()) { alert('Please enter an automation name'); return; }
        
        const method = currentAutomation.id ? 'PUT' : 'POST';
        const url = currentAutomation.id ? `https://genai-backend-1013063132017.us-central1.run.app/api/automations/${currentAutomation.id}` : 'https://genai-backend-1013063132017.us-central1.run.app/api/automations';
        
        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentAutomation)
        })
        .then(res => res.json())
        .then(data => {
            loadAutomations();
            setShowCreateModal(false);
            setCurrentAutomation({ id: null, name: '', enabled: true, trigger: { type: 'time', value: '09:00', label: 'Every day at 9:00 AM' }, condition: { type: 'tasks_pending', operator: '>', value: '0', label: 'If pending tasks > 0' }, action: { type: 'notification', value: 'Complete your pending tasks!', label: 'Send notification reminder' }, schedule: { type: 'daily', value: '1', label: 'Repeat daily' } });
            setEditingNode(null);
        })
        .catch(err => alert('Error saving automation'));
    };

    const handleDeleteAutomation = (id) => {
        if (confirm('Delete this automation?')) {
            fetch(`https://genai-backend-1013063132017.us-central1.run.app/api/automations/${id}`, { method: 'DELETE' })
            .then(() => loadAutomations());
        }
    };
    
    const handleToggleAutomation = (id) => {
        const auto = automations.find(a => a.id === id);
        if(!auto) return;
        fetch(`https://genai-backend-1013063132017.us-central1.run.app/api/automations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...auto, enabled: !auto.enabled })
        })
        .then(() => loadAutomations());
    };
    const handleLoadPreset = (preset) => { setCurrentAutomation({ ...preset, id: null, enabled: true }); setShowCreateModal(true); };
    const handleEditAutomation = (auto) => { setCurrentAutomation(auto); setShowCreateModal(true); };

    // Node builder helper
    const makeNode = (nodeType, icon, color, title, label, isLast) => {
        return React.createElement(React.Fragment, { key: nodeType },
            React.createElement('div', {
                onClick: () => setEditingNode(editingNode === nodeType ? null : nodeType),
                style: { flex: 1, minWidth: '160px', padding: '20px', backgroundColor: editingNode === nodeType ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)', borderRadius: '14px', border: editingNode === nodeType ? '2px solid ' + color : '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', textAlign: 'center' }
            },
                React.createElement('div', { style: { width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, ' + color + '22, ' + color + '44)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' } }, icon),
                React.createElement('h4', { style: { margin: '0 0 6px 0', color: color, fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' } }, title),
                React.createElement('p', { style: { margin: '0', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' } }, label),
                React.createElement('p', { style: { margin: '6px 0 0', color: 'var(--text-tertiary)', fontSize: '11px' } }, '✎ Click to edit')
            ),
            !isLast && React.createElement('div', { style: { display: 'flex', alignItems: 'center', padding: '0 4px', color: '#6366f1', fontSize: '20px', flexShrink: 0 } },
                React.createElement('div', { style: { width: '40px', height: '2px', background: 'linear-gradient(90deg, ' + color + ', #6366f1)', position: 'relative' } },
                    React.createElement('div', { style: { position: 'absolute', right: '-6px', top: '-4px', width: '0', height: '0', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #6366f1' } })
                )
            )
        );
    };

    // Node editor panel
    const makeNodeEditor = (nodeType, options, currentVal, onSelect) => {
        if (editingNode !== nodeType) return null;
        return React.createElement('div', { style: { padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-accent)', marginTop: '16px', animation: 'slideUp 0.3s ease-out' } },
            React.createElement('h4', { style: { margin: '0 0 14px 0', color: '#818cf8', fontSize: '13px', fontWeight: '600' } }, '⚙️ Configure ' + nodeType.charAt(0).toUpperCase() + nodeType.slice(1)),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' } },
                options.map(opt => React.createElement('div', { key: opt.type, onClick: () => {
                    const updated = { ...currentAutomation };
                    updated[nodeType] = { ...updated[nodeType], type: opt.type, label: opt.label + ' — ' + opt.desc };
                    setCurrentAutomation(updated);
                }, style: { padding: '14px', backgroundColor: currentVal.type === opt.type ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-glass)', border: currentVal.type === opt.type ? '2px solid #6366f1' : '1px solid var(--border-subtle)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' } },
                    React.createElement('h5', { style: { margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '13px' } }, opt.label),
                    React.createElement('p', { style: { margin: '0', color: 'var(--text-secondary)', fontSize: '11px' } }, opt.desc)
                ))
            ),
            nodeType === 'trigger' && currentAutomation.trigger.type === 'time' && React.createElement('div', { style: { marginTop: '12px' } },
                React.createElement('label', { style: { color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginBottom: '6px' } }, 'Time:'),
                React.createElement('input', { type: 'time', value: currentAutomation.trigger.value, onChange: (e) => setCurrentAutomation({ ...currentAutomation, trigger: { ...currentAutomation.trigger, value: e.target.value, label: 'Every day at ' + e.target.value } }), style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '14px' } })
            ),
            nodeType === 'action' && React.createElement('div', { style: { marginTop: '12px' } },
                React.createElement('label', { style: { color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginBottom: '6px' } }, 'Message / Value:'),
                React.createElement('input', { type: 'text', value: currentAutomation.action.value, onChange: (e) => setCurrentAutomation({ ...currentAutomation, action: { ...currentAutomation.action, value: e.target.value } }), placeholder: 'Enter action value...', style: { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' } })
            )
        );
    };

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', { style: { textAlign: 'center', color: '#6b6b80' } }, 'Loading...'));

    return React.createElement('div', { className: 'container' },
        // Header
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
            React.createElement('div', null,
                React.createElement('h2', { style: { margin: '0 0 6px 0', color: '#f0f0f5', fontSize: '24px', fontWeight: '700' } }, '⚡ Task Automation'),
                React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '13px' } }, 'Build visual automation pipelines — Trigger → Condition → Action')
            ),
            React.createElement('button', { onClick: () => { setCurrentAutomation({ id: null, name: '', enabled: true, trigger: { type: 'time', value: '09:00', label: 'Every day at 9:00 AM' }, condition: { type: 'tasks_pending', operator: '>', value: '0', label: 'If pending tasks > 0' }, action: { type: 'notification', value: 'Complete your pending tasks!', label: 'Send notification reminder' }, schedule: { type: 'daily', value: '1', label: 'Repeat daily' } }); setShowCreateModal(true); setEditingNode(null); }, style: { padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' } }, '➕ Create Automation')
        ),

        // Tab Switcher
        React.createElement('div', { style: { display: 'flex', gap: '4px', marginBottom: '24px', padding: '4px', backgroundColor: 'rgba(20, 20, 32, 0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' } },
            ['builder', 'history', 'ai'].map(v => React.createElement('button', { key: v, onClick: () => setActiveView(v), style: { flex: 1, padding: '10px 16px', backgroundColor: activeView === v ? 'rgba(99,102,241,0.15)' : 'transparent', border: activeView === v ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent', borderRadius: '8px', color: activeView === v ? '#818cf8' : '#6b6b80', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' } }, v === 'builder' ? '🔧 Automations' : v === 'history' ? '📜 Execution History' : '🤖 AI Workflows'))
        ),

        // ========== BUILDER VIEW ==========
        activeView === 'builder' && React.createElement('div', null,
            // Preset Templates
            React.createElement('div', { style: { marginBottom: '28px' } },
                React.createElement('h3', { style: { margin: '0 0 14px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px' } }, '🚀 Quick Start Templates'),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' } },
                    presetAutomations.map((preset, i) => React.createElement('div', { key: i, onClick: () => handleLoadPreset(preset), style: { padding: '16px', backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.25s' }, onMouseEnter: e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'; }, onMouseLeave: e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } },
                        React.createElement('h4', { style: { margin: '0 0 8px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, preset.name),
                        React.createElement('p', { style: { margin: '0 0 4px 0', color: '#a0a0b8', fontSize: '11px' } }, preset.trigger.label),
                        React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '11px' } }, '→ ' + preset.action.label),
                        React.createElement('span', { style: { display: 'inline-block', marginTop: '8px', padding: '3px 10px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '20px', fontSize: '10px', fontWeight: '600' } }, '+ Use Template')
                    ))
                )
            ),

            // Saved Automations List
            React.createElement('div', { style: { marginBottom: '28px' } },
                React.createElement('h3', { style: { margin: '0 0 14px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '700' } }, '📋 My Automations (' + automations.length + ')'),
                automations.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.08)' } },
                    React.createElement('p', { style: { fontSize: '36px', margin: '0 0 8px' } }, '⚡'),
                    React.createElement('p', { style: { color: '#6b6b80', fontSize: '13px' } }, 'No automations yet. Create one or use a template!')
                ),
                automations.map(auto => React.createElement('div', { key: auto.id, style: { padding: '18px', marginBottom: '10px', backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid ' + (auto.enabled ? '#10b981' : '#6b6b80'), transition: 'all 0.2s', opacity: auto.enabled ? 1 : 0.6 } },
                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                        React.createElement('div', { style: { flex: 1 } },
                            React.createElement('h4', { style: { margin: '0 0 6px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, auto.name),
                            React.createElement('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '11px' } },
                                React.createElement('span', { style: { padding: '3px 8px', backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderRadius: '6px' } }, '⏰ ' + auto.trigger.label),
                                React.createElement('span', { style: { color: '#6b6b80' } }, '→'),
                                React.createElement('span', { style: { padding: '3px 8px', backgroundColor: 'rgba(56,189,248,0.1)', color: '#38bdf8', borderRadius: '6px' } }, '🔍 ' + auto.condition.label),
                                React.createElement('span', { style: { color: '#6b6b80' } }, '→'),
                                React.createElement('span', { style: { padding: '3px 8px', backgroundColor: 'rgba(52,211,153,0.1)', color: '#34d399', borderRadius: '6px' } }, '🚀 ' + auto.action.label)
                            )
                        ),
                        React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' } },
                            React.createElement('button', { onClick: () => handleToggleAutomation(auto.id), style: { width: '44px', height: '24px', borderRadius: '12px', border: 'none', backgroundColor: auto.enabled ? '#10b981' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'all 0.3s' } },
                                React.createElement('div', { style: { width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: auto.enabled ? '23px' : '3px', transition: 'left 0.3s' } })
                            ),
                            React.createElement('button', { onClick: () => handleEditAutomation(auto), style: { padding: '6px 10px', backgroundColor: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' } }, '✏️'),
                            React.createElement('button', { onClick: () => handleDeleteAutomation(auto.id), style: { padding: '6px 10px', backgroundColor: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' } }, '✕')
                        )
                    )
                ))
            )
        ),

        // ========== HISTORY VIEW ==========
        activeView === 'history' && React.createElement('div', null,
            React.createElement('h3', { style: { margin: '0 0 16px 0', color: '#f0f0f5' } }, '📜 Execution History'),
            workflows.length === 0 && React.createElement('p', { style: { textAlign: 'center', color: '#6b6b80', padding: '30px' } }, 'No workflow executions yet.'),
            workflows.map(workflow => React.createElement('div', { key: workflow.id, style: { backgroundColor: 'rgba(20, 20, 32, 0.75)', padding: '18px', marginBottom: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid ' + (workflow.status === 'completed' ? '#10b981' : workflow.status === 'failed' ? '#ef4444' : '#f59e0b'), cursor: 'pointer', transition: 'all 0.2s' }, onClick: () => setSelectedWorkflow(selectedWorkflow === workflow.id ? null : workflow.id) },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' } },
                    React.createElement('div', { style: { flex: 1 } },
                        React.createElement('h4', { style: { margin: '0 0 6px', color: '#f0f0f5', fontSize: '14px', wordBreak: 'break-word' } }, workflow.user_request || workflow.request || 'Workflow ' + workflow.id),
                        React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '12px' } }, '📅 ' + new Date(workflow.created_at).toLocaleString()),
                        selectedWorkflow === workflow.id && workflow.result && React.createElement('div', { style: { marginTop: '12px', padding: '12px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '8px', borderLeft: '3px solid #6366f1', fontSize: '13px', color: '#a0a0b8', maxHeight: '200px', overflowY: 'auto' } },
                            React.createElement('strong', null, 'Result:'),
                            React.createElement('p', { style: { margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, workflow.result)
                        )
                    ),
                    React.createElement('span', { style: { padding: '6px 12px', backgroundColor: workflow.status === 'completed' ? 'rgba(52,211,153,0.12)' : workflow.status === 'failed' ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.12)', color: workflow.status === 'completed' ? '#34d399' : workflow.status === 'failed' ? '#f87171' : '#fbbf24', borderRadius: '20px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' } }, (workflow.status === 'completed' ? '✓' : workflow.status === 'failed' ? '✕' : '⟳') + ' ' + workflow.status)
                )
            ))
        ),

        // ========== AI WORKFLOW VIEW ==========
        activeView === 'ai' && React.createElement('div', null,
            React.createElement('div', { style: { marginBottom: '24px', padding: '24px', backgroundColor: 'rgba(99, 102, 241, 0.08)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' } },
                React.createElement('h3', { style: { margin: '0 0 14px 0', color: '#f0f0f5', fontSize: '15px', fontWeight: '700' } }, '🤖 AI Multi-Agent Workflow'),
                React.createElement('p', { style: { color: '#a0a0b8', fontSize: '13px', marginBottom: '16px' } }, 'Describe a task and let AI agents coordinate to complete it.'),
                React.createElement('textarea', { placeholder: 'Describe your task in detail...', value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), style: { display: 'block', width: '100%', padding: '12px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '14px', minHeight: '100px', fontFamily: 'inherit', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.04)', color: '#f0f0f5' } }),
                React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                    React.createElement('button', { onClick: handleExecuteWorkflow, disabled: executing || !formData.description.trim(), style: { padding: '12px 25px', background: executing || !formData.description.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', cursor: executing ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' } }, executing ? '⟳ Executing...' : '▶ Start Workflow')
                )
            )
        ),

        // ========== CREATE/EDIT MODAL ==========
        showCreateModal && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }, onClick: (e) => { if (e.target === e.currentTarget) { setShowCreateModal(false); setEditingNode(null); } } },
            React.createElement('div', { style: { backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', padding: '32px', maxWidth: '800px', width: '95%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' } },
                // Modal Header
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
                    React.createElement('h2', { style: { margin: 0, color: 'var(--text-primary)', fontSize: '20px' } }, currentAutomation.id ? '✏️ Edit Automation' : '⚡ New Automation'),
                    React.createElement('button', { onClick: () => { setShowCreateModal(false); setEditingNode(null); }, style: { background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer' } }, '✕')
                ),
                // Name Input
                React.createElement('div', { style: { marginBottom: '24px' } },
                    React.createElement('label', { style: { color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' } }, 'Automation Name'),
                    React.createElement('input', { type: 'text', value: currentAutomation.name, onChange: (e) => setCurrentAutomation({ ...currentAutomation, name: e.target.value }), placeholder: 'e.g., Morning Task Reminder', style: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '15px', boxSizing: 'border-box', fontFamily: 'inherit' } })
                ),
                // Visual Pipeline
                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '14px', letterSpacing: '1px', textTransform: 'uppercase' } }, 'Automation Pipeline'),
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto', padding: '8px 0' } },
                        makeNode('trigger', '⏰', '#fbbf24', 'TRIGGER', currentAutomation.trigger.label, false),
                        makeNode('condition', '🔍', '#38bdf8', 'CONDITION', currentAutomation.condition.label, false),
                        makeNode('action', '🚀', '#34d399', 'ACTION', currentAutomation.action.label, false),
                        makeNode('schedule', '🔁', '#a78bfa', 'SCHEDULE', currentAutomation.schedule.label, true)
                    )
                ),
                // Node Editor (shown when a node is clicked)
                makeNodeEditor('trigger', triggerOptions, currentAutomation.trigger),
                makeNodeEditor('condition', conditionOptions, currentAutomation.condition),
                makeNodeEditor('action', actionOptions, currentAutomation.action),
                makeNodeEditor('schedule', scheduleOptions, currentAutomation.schedule),
                // Save Button
                React.createElement('div', { style: { display: 'flex', gap: '10px', marginTop: '24px' } },
                    React.createElement('button', { onClick: () => { setShowCreateModal(false); setEditingNode(null); }, style: { flex: 1, padding: '12px', backgroundColor: 'var(--bg-glass)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' } }, 'Cancel'),
                    React.createElement('button', { onClick: handleSaveAutomation, style: { flex: 2, padding: '12px', background: 'var(--gradient-primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' } }, currentAutomation.id ? '💾 Update Automation' : '⚡ Save Automation')
                )
            )
        )
    );
}


// ====== DATA ANALYSIS COMPONENT ======
function DataAnalysis({ refreshTrigger, onRefresh }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState('bar');
    const [analysisType, setAnalysisType] = useState('overview');
    const [aiInsights, setAiInsights] = useState([]);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [uploadedData, setUploadedData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [dateRange, setDateRange] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const chartRefs = { bar: useRef(null), line: useRef(null), pie: useRef(null), donut: useRef(null) };
    const chartInstances = useRef({});

    useEffect(() => {
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks')
            .then(r => r.json()).then(data => { setTasks(data || []); setLoading(false); })
            .catch(() => { setTasks([]); setLoading(false); });
    }, [refreshTrigger]);

    // Computed analytics
    const analytics = useMemo(() => {
        if (!tasks.length) return { total: 0, completed: 0, pending: 0, efficiency: 0, byCategory: {}, byPriority: {}, byDay: {}, byStatus: {} };
        const completed = tasks.filter(t => t.status === 'completed').length;
        const pending = tasks.filter(t => t.status !== 'completed').length;
        const byCategory = {}; const byPriority = { high: 0, medium: 0, low: 0 }; const byDay = {}; const byStatus = {};
        tasks.forEach(t => {
            const cat = t.category || 'uncategorized'; byCategory[cat] = (byCategory[cat] || 0) + 1;
            const pri = t.priority || 'medium'; byPriority[pri] = (byPriority[pri] || 0) + 1;
            const day = new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'short' }); byDay[day] = (byDay[day] || 0) + 1;
            const st = t.status || 'pending'; byStatus[st] = (byStatus[st] || 0) + 1;
        });
        return { total: tasks.length, completed, pending, efficiency: tasks.length ? Math.round((completed / tasks.length) * 100) : 0, byCategory, byPriority, byDay, byStatus };
    }, [tasks]);

    // Chart rendering
    useEffect(() => {
        if (loading || !window.Chart) return;
        Object.values(chartInstances.current).forEach(c => { try { c.destroy(); } catch(e){} });
        chartInstances.current = {};
        const darkGrid = { color: 'rgba(255,255,255,0.06)' };
        const darkTick = { color: '#6b6b80' };
        const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f87171','#34d399'];

        // Bar Chart
        if (chartRefs.bar.current) {
            const ctx = chartRefs.bar.current.getContext('2d');
            const labels = Object.keys(analytics.byCategory);
            chartInstances.current.bar = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Tasks by Category', data: labels.map(l => analytics.byCategory[l]), backgroundColor: colors.slice(0, labels.length).map(c => c + '88'), borderColor: colors.slice(0, labels.length), borderWidth: 2, borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a0a0b8' } } }, scales: { x: { grid: darkGrid, ticks: darkTick }, y: { grid: darkGrid, ticks: darkTick, beginAtZero: true } } } });
        }
        // Line Chart
        if (chartRefs.line.current) {
            const ctx = chartRefs.line.current.getContext('2d');
            const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
            chartInstances.current.line = new Chart(ctx, { type: 'line', data: { labels: days, datasets: [{ label: 'Tasks Created', data: days.map(d => analytics.byDay[d] || 0), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#8b5cf6', pointRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a0a0b8' } } }, scales: { x: { grid: darkGrid, ticks: darkTick }, y: { grid: darkGrid, ticks: darkTick, beginAtZero: true } } } });
        }
        // Pie Chart
        if (chartRefs.pie.current) {
            const ctx = chartRefs.pie.current.getContext('2d');
            const labels = Object.keys(analytics.byPriority);
            const pColors = { high: '#f87171', medium: '#fbbf24', low: '#34d399' };
            chartInstances.current.pie = new Chart(ctx, { type: 'pie', data: { labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)), datasets: [{ data: labels.map(l => analytics.byPriority[l]), backgroundColor: labels.map(l => pColors[l] || '#6366f1'), borderColor: 'rgba(20,20,32,0.9)', borderWidth: 3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#a0a0b8', padding: 16 } } } } });
        }
        // Donut Chart
        if (chartRefs.donut.current) {
            const ctx = chartRefs.donut.current.getContext('2d');
            const labels = Object.keys(analytics.byStatus);
            const sColors = { completed: '#34d399', pending: '#fbbf24', in_progress: '#38bdf8' };
            chartInstances.current.donut = new Chart(ctx, { type: 'doughnut', data: { labels: labels.map(l => l.replace('_',' ')), datasets: [{ data: labels.map(l => analytics.byStatus[l]), backgroundColor: labels.map(l => sColors[l] || '#a78bfa'), borderColor: 'rgba(20,20,32,0.9)', borderWidth: 3 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#a0a0b8', padding: 16 } } } } });
        }
        return () => { Object.values(chartInstances.current).forEach(c => { try { c.destroy(); } catch(e){} }); };
    }, [loading, tasks, analytics]);

    // AI Insights
    const generateInsights = () => {
        setInsightsLoading(true);
        const prompt = `Analyze this task data and provide 5 actionable insights:\n- Total: ${analytics.total}, Completed: ${analytics.completed}, Pending: ${analytics.pending}, Efficiency: ${analytics.efficiency}%\n- Categories: ${JSON.stringify(analytics.byCategory)}\n- Priority: ${JSON.stringify(analytics.byPriority)}\n- By Day: ${JSON.stringify(analytics.byDay)}\nProvide insights as bullet points.`;
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/ai-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        }).then(r => r.json()).then(data => {
            const text = data.assistant_response || 'No insights available';
            setAiInsights(text.split('\n').filter(l => l.trim()));
            setInsightsLoading(false);
        }).catch(() => { setAiInsights(['❌ Could not generate insights']); setInsightsLoading(false); });
    };

    // CSV Upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            const lines = text.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).map(l => { const vals = l.split(','); const obj = {}; headers.forEach((h, i) => obj[h] = (vals[i] || '').trim()); return obj; });
            setUploadedData({ headers, rows, filename: file.name });
        };
        reader.readAsText(file);
    };

    // Export Report
    const exportReport = () => {
        let report = '=== TaskMaster AI - Data Analysis Report ===\n';
        report += `Generated: ${new Date().toLocaleString()}\n\n`;
        report += `--- KPIs ---\nTotal Tasks: ${analytics.total}\nCompleted: ${analytics.completed}\nPending: ${analytics.pending}\nEfficiency: ${analytics.efficiency}%\n\n`;
        report += `--- By Category ---\n${Object.entries(analytics.byCategory).map(([k,v]) => `  ${k}: ${v}`).join('\n')}\n\n`;
        report += `--- By Priority ---\n${Object.entries(analytics.byPriority).map(([k,v]) => `  ${k}: ${v}`).join('\n')}\n\n`;
        if (aiInsights.length) report += `--- AI Insights ---\n${aiInsights.join('\n')}\n`;
        const blob = new Blob([report], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'taskmaster_analysis_report.txt'; a.click();
    };

    // Sort/filter tasks for table
    const filteredTasks = useMemo(() => {
        let result = [...tasks];
        if (searchQuery) result = result.filter(t => (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()));
        if (categoryFilter !== 'all') result = result.filter(t => (t.category || 'uncategorized') === categoryFilter);
        result.sort((a, b) => { const av = a[sortField] || ''; const bv = b[sortField] || ''; return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1); });
        return result;
    }, [tasks, searchQuery, categoryFilter, sortField, sortDir]);

    const categories = useMemo(() => [...new Set(tasks.map(t => t.category || 'uncategorized'))], [tasks]);

    // KPI Card helper
    const kpiCard = (icon, label, value, color, sub) => React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', borderTop: '3px solid ' + color, transition: 'all 0.3s' }, onMouseEnter: e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'; }, onMouseLeave: e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
            React.createElement('span', { style: { fontSize: '22px' } }, icon),
            React.createElement('span', { style: { color: '#6b6b80', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' } }, label)
        ),
        React.createElement('div', { style: { fontSize: '32px', fontWeight: '800', color: color, lineHeight: '1' } }, value),
        sub && React.createElement('p', { style: { margin: '6px 0 0', color: '#6b6b80', fontSize: '11px' } }, sub)
    );

    // Chart card helper
    const chartCard = (title, refKey, height) => React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' } },
        React.createElement('h4', { style: { margin: '0 0 14px', color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, title),
        React.createElement('div', { style: { height: height || '250px', position: 'relative' } },
            React.createElement('canvas', { ref: chartRefs[refKey] })
        )
    );

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', { style: { textAlign: 'center', color: '#6b6b80', padding: '40px' } }, '📊 Loading analytics...'));

    return React.createElement('div', { className: 'container' },
        // Header
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' } },
            React.createElement('div', null,
                React.createElement('h2', { style: { margin: '0 0 6px', color: '#f0f0f5', fontSize: '24px', fontWeight: '700' } }, '📊 Data Analysis Dashboard'),
                React.createElement('p', { style: { margin: 0, color: '#6b6b80', fontSize: '13px' } }, 'Real-time analytics from your task data — ' + analytics.total + ' tasks analyzed')
            ),
            React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                React.createElement('label', { style: { padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' } },
                    '📤 Upload CSV', React.createElement('input', { type: 'file', accept: '.csv,.txt', onChange: handleFileUpload, style: { display: 'none' } })
                ),
                React.createElement('button', { onClick: () => { onRefresh(); }, style: { padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#a0a0b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' } }, '🔄 Refresh'),
                React.createElement('button', { onClick: exportReport, style: { padding: '8px 16px', backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' } }, '📥 Export Report')
            )
        ),

        // KPI Cards Row
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' } },
            kpiCard('📋', 'Total Tasks', analytics.total, '#6366f1', 'All tracked tasks'),
            kpiCard('✅', 'Completed', analytics.completed, '#34d399', Math.round((analytics.completed/Math.max(analytics.total,1))*100) + '% done'),
            kpiCard('⏳', 'Pending', analytics.pending, '#fbbf24', 'Needs attention'),
            kpiCard('🎯', 'Efficiency', analytics.efficiency + '%', analytics.efficiency >= 70 ? '#34d399' : analytics.efficiency >= 40 ? '#fbbf24' : '#f87171', analytics.efficiency >= 70 ? 'Great work!' : 'Room to improve')
        ),

        // Charts Grid
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' } },
            chartCard('📊 Tasks by Category', 'bar', '260px'),
            chartCard('📈 Weekly Activity', 'line', '260px'),
            chartCard('🎯 Priority Distribution', 'pie', '260px'),
            chartCard('📋 Status Breakdown', 'donut', '260px')
        ),

        // AI Insights Section
        React.createElement('div', { style: { marginBottom: '24px', padding: '24px', backgroundColor: 'rgba(99,102,241,0.06)', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.15)' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
                React.createElement('h3', { style: { margin: 0, color: '#f0f0f5', fontSize: '16px', fontWeight: '700' } }, '🤖 AI-Powered Insights'),
                React.createElement('button', { onClick: generateInsights, disabled: insightsLoading, style: { padding: '8px 18px', background: insightsLoading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', cursor: insightsLoading ? 'wait' : 'pointer', fontSize: '12px', fontWeight: '600' } }, insightsLoading ? '⟳ Analyzing...' : '✨ Generate Insights')
            ),
            aiInsights.length === 0 && !insightsLoading && React.createElement('p', { style: { color: '#6b6b80', fontSize: '13px', textAlign: 'center', padding: '20px' } }, 'Click "Generate Insights" to get AI-powered analysis of your task data.'),
            aiInsights.length > 0 && React.createElement('div', { style: { display: 'grid', gap: '8px' } },
                aiInsights.map((insight, i) => React.createElement('div', { key: i, style: { padding: '12px 16px', backgroundColor: 'rgba(20,20,32,0.6)', borderRadius: '10px', borderLeft: '3px solid #818cf8', color: '#a0a0b8', fontSize: '13px', lineHeight: '1.6' } }, insight))
            )
        ),

        // Uploaded Data Preview
        uploadedData && React.createElement('div', { style: { marginBottom: '24px', padding: '20px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
                React.createElement('h3', { style: { margin: 0, color: '#f0f0f5', fontSize: '15px' } }, '📁 Uploaded: ' + uploadedData.filename + ' (' + uploadedData.rows.length + ' rows)'),
                React.createElement('button', { onClick: () => setUploadedData(null), style: { padding: '4px 12px', backgroundColor: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' } }, '✕ Clear')
            ),
            React.createElement('div', { style: { overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' } },
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } },
                    React.createElement('thead', null, React.createElement('tr', null,
                        uploadedData.headers.map(h => React.createElement('th', { key: h, style: { padding: '10px 12px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: '600', whiteSpace: 'nowrap' } }, h))
                    )),
                    React.createElement('tbody', null,
                        uploadedData.rows.slice(0, 50).map((row, i) => React.createElement('tr', { key: i, style: { borderBottom: '1px solid rgba(255,255,255,0.04)' } },
                            uploadedData.headers.map(h => React.createElement('td', { key: h, style: { padding: '8px 12px', color: '#a0a0b8', whiteSpace: 'nowrap' } }, row[h] || '—'))
                        ))
                    )
                )
            )
        ),

        // Data Table
        React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' } },
                React.createElement('h3', { style: { margin: 0, color: '#f0f0f5', fontSize: '15px' } }, '📋 Task Data Table'),
                React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                    React.createElement('input', { type: 'text', placeholder: '🔍 Search tasks...', value: searchQuery, onChange: e => setSearchQuery(e.target.value), style: { padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f0f0f5', fontSize: '12px', width: '160px' } }),
                    React.createElement('select', { value: categoryFilter, onChange: e => setCategoryFilter(e.target.value), style: { padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f0f0f5', fontSize: '12px' } },
                        React.createElement('option', { value: 'all' }, 'All Categories'),
                        categories.map(c => React.createElement('option', { key: c, value: c }, c))
                    )
                )
            ),
            React.createElement('div', { style: { overflowX: 'auto', maxHeight: '350px', overflowY: 'auto' } },
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } },
                    React.createElement('thead', null, React.createElement('tr', null,
                        ['Title', 'Category', 'Priority', 'Status', 'Created'].map(h => React.createElement('th', { key: h, onClick: () => { const field = h.toLowerCase().replace(' ','_'); setSortField(field === 'created' ? 'created_at' : field); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }, style: { padding: '10px 12px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' } }, h + (sortField === (h.toLowerCase() === 'created' ? 'created_at' : h.toLowerCase()) ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')))
                    )),
                    React.createElement('tbody', null,
                        filteredTasks.slice(0, 50).map((t, i) => React.createElement('tr', { key: t.id || i, style: { borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }, onMouseEnter: e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.04)', onMouseLeave: e => e.currentTarget.style.backgroundColor = 'transparent' },
                            React.createElement('td', { style: { padding: '10px 12px', color: '#1a1a2e', fontWeight: '600', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.title || '—'),
                            React.createElement('td', { style: { padding: '10px 12px' } }, React.createElement('span', { style: { padding: '3px 8px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '6px', fontSize: '11px' } }, t.category || 'uncategorized')),
                            React.createElement('td', { style: { padding: '10px 12px' } }, React.createElement('span', { style: { padding: '3px 8px', backgroundColor: t.priority === 'high' ? 'rgba(248,113,113,0.12)' : t.priority === 'low' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)', color: t.priority === 'high' ? '#f87171' : t.priority === 'low' ? '#34d399' : '#fbbf24', borderRadius: '6px', fontSize: '11px', fontWeight: '600' } }, (t.priority || 'medium'))),
                            React.createElement('td', { style: { padding: '10px 12px' } }, React.createElement('span', { style: { padding: '3px 8px', backgroundColor: t.status === 'completed' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)', color: t.status === 'completed' ? '#34d399' : '#fbbf24', borderRadius: '6px', fontSize: '11px', fontWeight: '600' } }, t.status || 'pending')),
                            React.createElement('td', { style: { padding: '10px 12px', color: '#6b6b80', whiteSpace: 'nowrap' } }, t.created_at ? new Date(t.created_at).toLocaleDateString() : '—')
                        ))
                    )
                )
            ),
            React.createElement('p', { style: { margin: '10px 0 0', color: '#6b6b80', fontSize: '11px', textAlign: 'right' } }, 'Showing ' + Math.min(filteredTasks.length, 50) + ' of ' + filteredTasks.length + ' tasks')
        )
    );
}


// ====== PROJECT PLANNER COMPONENT ======
function ProjectPlanner({ refreshTrigger, onRefresh }) {
    const [goalInput, setGoalInput] = useState('');
    const [projects, setProjects] = useState(() => { try { return JSON.parse(localStorage.getItem('tm_projects') || '[]'); } catch(e) { return []; } });
    const [activeProject, setActiveProject] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [kanbanView, setKanbanView] = useState('kanban');
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [backendTasks, setBackendTasks] = useState([]);

    // Fetch real tasks from TaskManager backend
    useEffect(() => {
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks')
            .then(r => r.json()).then(data => {
                if (data && data.length) {
                    setBackendTasks(data);
                    // Auto-create "My TaskManager Tasks" project from real data
                    const mapped = data.map((t, i) => {
                        const created = new Date(t.created_at);
                        const now = new Date();
                        const weekDiff = Math.max(1, Math.ceil((now - created) / (7 * 24 * 60 * 60 * 1000)));
                        const status = t.status === 'completed' ? 'done' : t.status === 'in_progress' ? 'in_progress' : 'todo';
                        return { id: t.id || i + 1, title: t.title, priority: t.priority || 'medium', week: Math.min(weekDiff, 8), duration: 1, status, category: t.category || 'general' };
                    });
                    const tmProject = { id: 'taskmanager', goal: 'My TaskManager Tasks (' + data.length + ' tasks)', tasks: mapped, createdAt: new Date().toISOString(), isLive: true };
                    // Merge with saved projects (replace old live project)
                    setProjects(prev => {
                        const withoutLive = prev.filter(p => p.id !== 'taskmanager');
                        return [tmProject, ...withoutLive];
                    });
                }
            }).catch(() => {});
    }, [refreshTrigger]);

    const saveProjects = (list) => { setProjects(list); localStorage.setItem('tm_projects', JSON.stringify(list.filter(p => !p.isLive))); };

    const generatePlan = () => {
        if (!goalInput.trim()) return;
        setGenerating(true);
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/ai-chat', {
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/ai-chat', {
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
            React.createElement('h2', { style: { margin: '0 0 6px', color: 'var(--text-primary)', fontSize: '24px', fontWeight: '700' } }, '📋 Project Planner'),
            React.createElement('p', { style: { margin: 0, color: 'var(--text-secondary)', fontSize: '13px' } }, 'AI-powered project planning — Enter a goal and get an instant plan')
        ),
        // Goal Input
        React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '24px' } },
            React.createElement('input', { type: 'text', value: goalInput, onChange: e => setGoalInput(e.target.value), onKeyDown: e => e.key === 'Enter' && generatePlan(), placeholder: '🎯 Enter your project goal... (e.g., "Launch a SaaS product")', style: { flex: 1, padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-accent)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' } }),
            React.createElement('button', { onClick: generatePlan, disabled: generating || !goalInput.trim(), style: { padding: '14px 24px', background: generating ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', cursor: generating ? 'wait' : 'pointer', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap' } }, generating ? '⟳ Generating...' : '🚀 Generate Plan')
        ),
        // Project List
        projects.length > 0 && !activeProject && React.createElement('div', { style: { marginBottom: '24px' } },
            React.createElement('h3', { style: { margin: '0 0 14px', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' } }, '📂 My Projects (' + projects.length + ')'),
            projects.map(p => React.createElement('div', { key: p.id, onClick: () => { setActiveProject(p); generateSuggestions(p.goal); }, style: { padding: '16px', marginBottom: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, onMouseEnter: e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }, onMouseLeave: e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = 'none'; } },
                React.createElement('div', null,
                    React.createElement('h4', { style: { margin: '0 0 4px', color: 'var(--text-primary)', fontSize: '14px' } }, '🎯 ' + p.goal),
                    React.createElement('p', { style: { margin: 0, color: 'var(--text-secondary)', fontSize: '11px' } }, p.tasks.length + ' tasks • ' + new Date(p.createdAt).toLocaleDateString())
                ),
                React.createElement('div', { style: { display: 'flex', gap: '6px' } },
                    React.createElement('span', { style: { padding: '4px 10px', backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)', borderRadius: '6px', fontSize: '11px' } }, p.tasks.filter(t=>t.status==='done').length + '/' + p.tasks.length + ' done'),
                    React.createElement('button', { onClick: (e) => { e.stopPropagation(); deleteProject(p.id); }, style: { padding: '4px 8px', backgroundColor: 'rgba(248,113,113,0.1)', color: 'var(--danger, #f87171)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' } }, '✕')
                )
            ))
        ),
        // Active Project View
        activeProject && React.createElement('div', null,
            // Back button + Progress
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                    React.createElement('button', { onClick: () => setActiveProject(null), style: { padding: '6px 14px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' } }, '← Back'),
                    React.createElement('h3', { style: { margin: 0, color: 'var(--text-primary)', fontSize: '16px' } }, '🎯 ' + activeProject.goal)
                ),
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                    React.createElement('div', { style: { width: '150px', height: '8px', backgroundColor: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' } },
                        React.createElement('div', { style: { width: progress + '%', height: '100%', background: progress >= 80 ? 'var(--success, #34d399)' : progress >= 40 ? 'var(--warning, #fbbf24)' : 'var(--accent-primary)', borderRadius: '4px', transition: 'width 0.5s' } })
                    ),
                    React.createElement('span', { style: { color: progress >= 80 ? 'var(--success, #34d399)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: '700' } }, progress + '%')
                )
            ),
            // View Toggle
            React.createElement('div', { style: { display: 'flex', gap: '4px', marginBottom: '20px', padding: '4px', backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' } },
                ['kanban', 'timeline', 'list'].map(v => React.createElement('button', { key: v, onClick: () => setKanbanView(v), style: { flex: 1, padding: '8px', backgroundColor: kanbanView === v ? 'var(--accent-primary-light)' : 'transparent', border: kanbanView === v ? '1px solid var(--border-accent)' : '1px solid transparent', borderRadius: '8px', color: kanbanView === v ? 'var(--accent-primary)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' } }, v === 'kanban' ? '📊 Kanban' : v === 'timeline' ? '📅 Timeline' : '📋 List'))
            ),
            // KANBAN VIEW
            kanbanView === 'kanban' && React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' } },
                statusCols.map(status => React.createElement('div', { key: status, style: { padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-default)', minHeight: '200px' } },
                    React.createElement('h4', { style: { margin: '0 0 14px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' } }, statusLabels[status], React.createElement('span', { style: { backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' } }, activeProject.tasks.filter(t => (t.status||'todo') === status).length)),
                    activeProject.tasks.filter(t => (t.status||'todo') === status).map(task => React.createElement('div', { key: task.id, style: { padding: '12px', marginBottom: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-default)', borderLeft: '3px solid ' + priColor(task.priority) } },
                        React.createElement('p', { style: { margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' } }, task.title),
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                            React.createElement('span', { style: { padding: '2px 8px', backgroundColor: priColor(task.priority) + '18', color: priColor(task.priority), borderRadius: '6px', fontSize: '10px', fontWeight: '600' } }, task.priority),
                            React.createElement('select', { value: task.status || 'todo', onChange: e => updateTaskStatus(task.id, e.target.value), style: { padding: '3px 6px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' } },
                                React.createElement('option', { value: 'todo' }, 'To Do'),
                                React.createElement('option', { value: 'in_progress' }, 'In Progress'),
                                React.createElement('option', { value: 'done' }, 'Done')
                            )
                        )
                    ))
                ))
            ),
            // TIMELINE VIEW
            kanbanView === 'timeline' && React.createElement('div', { style: { padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-default)', marginBottom: '24px', overflowX: 'auto' } },
                React.createElement('div', { style: { display: 'flex', marginBottom: '10px', paddingLeft: '140px' } },
                    Array.from({ length: maxWeek }, (_, i) => React.createElement('div', { key: i, style: { flex: '0 0 80px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: '600' } }, 'Week ' + (i + 1)))
                ),
                activeProject.tasks.map(task => React.createElement('div', { key: task.id, style: { display: 'flex', alignItems: 'center', marginBottom: '6px', height: '32px' } },
                    React.createElement('div', { style: { width: '140px', flexShrink: 0, fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' } }, task.title),
                    React.createElement('div', { style: { flex: 1, position: 'relative', height: '24px', display: 'flex' } },
                        Array.from({ length: maxWeek }, (_, i) => React.createElement('div', { key: i, style: { flex: '0 0 80px', borderLeft: '1px solid var(--border-subtle)' } })),
                        React.createElement('div', { style: { position: 'absolute', left: ((task.week || 1) - 1) * 80 + 'px', width: (task.duration || 1) * 80 - 8 + 'px', height: '24px', background: 'linear-gradient(90deg, ' + priColor(task.priority) + '88, ' + priColor(task.priority) + '44)', borderRadius: '6px', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '10px', color: '#fff', fontWeight: '600' } }, task.title.substring(0, 15))
                    )
                ))
            ),
            // LIST VIEW
            kanbanView === 'list' && React.createElement('div', { style: { marginBottom: '24px' } },
                activeProject.tasks.map(task => React.createElement('div', { key: task.id, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', marginBottom: '6px', backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-default)', borderLeft: '3px solid ' + priColor(task.priority) } },
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 } },
                        React.createElement('input', { type: 'checkbox', checked: task.status === 'done', onChange: () => updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done'), style: { width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' } }),
                        React.createElement('span', { style: { color: task.status === 'done' ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: '13px', fontWeight: '500', textDecoration: task.status === 'done' ? 'line-through' : 'none' } }, task.title)
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                        React.createElement('span', { style: { padding: '3px 8px', backgroundColor: priColor(task.priority) + '18', color: priColor(task.priority), borderRadius: '6px', fontSize: '10px', fontWeight: '600' } }, task.priority),
                        React.createElement('span', { style: { color: 'var(--text-tertiary)', fontSize: '11px' } }, 'W' + (task.week || 1)),
                        React.createElement('select', { value: task.status || 'todo', onChange: e => updateTaskStatus(task.id, e.target.value), style: { padding: '4px 8px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' } },
                            React.createElement('option', { value: 'todo' }, 'To Do'),
                            React.createElement('option', { value: 'in_progress' }, 'In Progress'),
                            React.createElement('option', { value: 'done' }, 'Done')
                        )
                    )
                ))
            ),
            // AI Suggestions
            aiSuggestions.length > 0 && React.createElement('div', { style: { padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-default)' } },
                React.createElement('h4', { style: { margin: '0 0 12px', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: '700' } }, '🤖 AI Suggestions'),
                aiSuggestions.map((s, i) => React.createElement('p', { key: i, style: { margin: '0 0 6px', padding: '8px 12px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)', color: 'var(--text-primary)', fontSize: '12px' } }, s))
            )
        ),
        // Empty state
        projects.length === 0 && !activeProject && React.createElement('div', { style: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '2px dashed var(--border-default)' } },
            React.createElement('p', { style: { fontSize: '48px', margin: '0 0 12px' } }, '📋'),
            React.createElement('h3', { style: { margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '18px' } }, 'No Projects Yet'),
            React.createElement('p', { style: { color: 'var(--text-secondary)', fontSize: '13px' } }, 'Enter a goal above and click "Generate Plan" to get started!')
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks')
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
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/ai-chat', {
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
        
        // Automatically save to schedule
        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: `Auto Daily Plan`,
                description: `Morning:\n${plan.morning.join('\n')}\n\nAfternoon:\n${plan.afternoon.join('\n')}\n\nEvening:\n${plan.evening.join('\n')}`,
                event_time: new Date().toISOString(),
                priority: 'high'
            })
        }).then(() => onRefresh && onRefresh());

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
            
            // Actually create the schedule event on the backend
            const [startHour, startMinute] = planFormData.workStart.split(':');
            const eventDate = new Date();
            eventDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
            
            fetch('https://genai-backend-1013063132017.us-central1.run.app/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `Daily Plan: ${planFormData.focusArea.toUpperCase()} Focus`,
                    description: `Morning:\n${plan.morning.join('\n')}\n\nAfternoon:\n${plan.afternoon.join('\n')}\n\nEvening:\n${plan.evening.join('\n')}`,
                    event_time: eventDate.toISOString(),
                    priority: 'high'
                })
            }).then(() => onRefresh && onRefresh());

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

        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/suggestions')
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
        React.createElement('h2', { style: { marginTop: 0, color: 'var(--text-primary)' } }, '🤖 AI Life Assistant'),
        React.createElement('p', { style: { color: 'var(--text-secondary)', marginBottom: '30px' } }, 'Smart daily task planning, life optimization & interactive chat'),

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
                    backgroundColor: showChat ? 'var(--success)' : 'var(--accent-primary)',
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
                    backgroundColor: analyzing ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                    color: analyzing ? 'var(--text-tertiary)' : 'white',
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
                    backgroundColor: analyzing ? 'var(--bg-secondary)' : 'var(--accent-secondary)',
                    color: analyzing ? 'var(--text-tertiary)' : 'white',
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
            backgroundColor: 'var(--bg-secondary)',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid var(--accent-primary)',
            marginBottom: '30px'
        }},
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                React.createElement('h3', { style: { margin: 0, color: 'var(--text-primary)' } }, '💬 Interactive Chat'),
                React.createElement('button', {
                    onClick: () => {
                        setShowChat(false);
                        window.speechSynthesis.cancel();
                        setIsSpeaking(false);
                    },
                    style: { backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }
                }, '✕')
            ),

            // Chat messages display
            React.createElement('div', { style: {
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '20px',
                height: '300px',
                overflowY: 'auto',
                marginBottom: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }},
                chatMessages.length === 0 ? React.createElement('div', { style: { color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: '300px' } }, 'Start a conversation...') : null,
                chatMessages.map((msg, idx) => React.createElement('div', {
                    key: idx,
                    style: {
                        padding: '14px 18px',
                        borderRadius: '12px',
                        backgroundColor: msg.role === 'user' ? '#6366f1' : '#f1f5f9',
                        color: msg.role === 'user' ? '#ffffff' : '#111827',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        boxShadow: msg.role === 'user' ? '0 2px 8px rgba(99,102,241,0.3)' : '0 1px 4px rgba(0,0,0,0.1)',
                        border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0'
                    }
                },
                    React.createElement('div', { style: { fontSize: '11px', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#6b7280', marginBottom: '6px', fontWeight: '500' } }, msg.timestamp),
                    React.createElement('div', { style: { fontSize: '14px', lineHeight: '1.6', color: msg.role === 'user' ? '#ffffff' : '#111827' } }, msg.content)
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
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
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
            backgroundColor: 'rgba(56, 189, 248, 0.06)',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid rgba(56, 189, 248, 0.3)',
            marginBottom: '30px'
        }},
            React.createElement('h3', { style: { margin: '0 0 20px 0', color: '#38bdf8' } }, '📅 Today\'s AI-Optimized Plan'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' } },
                React.createElement('div', { style: { padding: '15px', backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' } },
                    React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#fb923c' } }, '🌅 Morning (High Priority)'),
                    todayPlan.morning.length > 0 ? React.createElement('ul', { style: { margin: '0', paddingLeft: '20px', color: '#a0a0b8', fontSize: '14px' } },
                        todayPlan.morning.map((task, i) => React.createElement('li', { key: i, style: { marginBottom: '8px' } }, task))
                    ) : React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '14px' } }, 'No high-priority tasks')
                ),
                React.createElement('div', { style: { padding: '15px', backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' } },
                    React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#34d399' } }, '☀️ Afternoon (Medium Priority)'),
                    todayPlan.afternoon.length > 0 ? React.createElement('ul', { style: { margin: '0', paddingLeft: '20px', color: '#a0a0b8', fontSize: '14px' } },
                        todayPlan.afternoon.map((task, i) => React.createElement('li', { key: i, style: { marginBottom: '8px' } }, task))
                    ) : React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '14px' } }, 'No medium-priority tasks')
                ),
                React.createElement('div', { style: { padding: '15px', backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' } },
                    React.createElement('h4', { style: { margin: '0 0 10px 0', color: '#a78bfa' } }, '🌙 Evening (Low Priority)'),
                    todayPlan.evening.length > 0 ? React.createElement('ul', { style: { margin: '0', paddingLeft: '20px', color: '#a0a0b8', fontSize: '14px' } },
                        todayPlan.evening.map((task, i) => React.createElement('li', { key: i, style: { marginBottom: '8px' } }, task))
                    ) : React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '14px' } }, 'No low-priority tasks')
                )
            ),
            React.createElement('div', { style: { marginTop: '20px', display: 'flex', gap: '20px', fontSize: '14px', color: '#a0a0b8' } },
                React.createElement('span', null, React.createElement('strong', null, '📊 Total Tasks: '), todayPlan.total),
                React.createElement('span', null, React.createElement('strong', null, '✓ Completed: '), todayPlan.completed),
                React.createElement('span', null, React.createElement('strong', null, '⏳ Remaining: '), todayPlan.total - todayPlan.completed)
            )
        ),

        suggestions.length > 0 && React.createElement('div', { style: { marginBottom: '40px' }},
            React.createElement('h3', { style: { marginBottom: '20px', color: '#f0f0f5', fontSize: '20px', fontWeight: 'bold' } }, '💡 AI-Powered Suggestions & Fixes'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px' } },
                suggestions.map((suggestion, idx) => React.createElement('div', { key: suggestion.id || idx, style: {
                    backgroundColor: 'rgba(20, 20, 32, 0.75)',
                    padding: '25px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255,255,255,0.08)',
                    borderLeft: '6px solid #6366f1',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
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
                                React.createElement('h4', { style: { margin: '0', fontSize: '16px', fontWeight: '700', color: '#f0f0f5' } }, suggestion.title),
                                React.createElement('span', { style: { backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', minWidth: 'fit-content' } }, suggestion.type)
                            ),
                            React.createElement('p', { style: { margin: '0 0 15px 0', color: '#a0a0b8', fontSize: '14px', lineHeight: '1.6' } }, suggestion.description),
                            
                            // Fix Section
                            React.createElement('div', { style: { backgroundColor: 'rgba(251, 191, 36, 0.12)', borderLeft: '4px solid #f59e0b', padding: '15px', borderRadius: '6px', marginBottom: '15px' } },
                                React.createElement('h5', { style: { margin: '0 0 8px 0', color: '#fbbf24', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' } }, '🔧 Recommended Fix'),
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
                                        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/tasks', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                title: `[AI Suggestion] ${suggestion.title}`,
                                                description: suggestion.fix || suggestion.description,
                                                priority: 'medium'
                                            })
                                        })
                                        .then(() => {
                                            if (onRefresh) onRefresh();
                                            alert('✓ Suggestion added to your tasks!');
                                        })
                                        .catch(err => {
                                            console.error('Error adding suggestion task:', err);
                                            alert('Error adding suggestion task');
                                        });
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
            backgroundColor: 'rgba(251, 191, 36, 0.12)',
            borderRadius: '8px',
            border: '2px solid #f59e0b'
        }},
            React.createElement('h3', { style: { margin: '0 0 15px 0', color: '#fbbf24' } }, '🎯 How to Use AI Assistant'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' } },
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0' } }, React.createElement('strong', null, '1️⃣ Chat & Ask')),
                    React.createElement('p', { style: { margin: '0', color: '#a0a0b8' } }, 'Click "Ask Anything" to chat with AI. Use voice input (🎤) for hands-free interaction.')
                ),
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0' } }, React.createElement('strong', null, '2️⃣ Voice Commands')),
                    React.createElement('p', { style: { margin: '0', color: '#a0a0b8' } }, 'Click the microphone button and speak your questions. AI will respond with text and voice.')
                ),
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0' } }, React.createElement('strong', null, '3️⃣ Create Daily Plan')),
                    React.createElement('p', { style: { margin: '0', color: '#a0a0b8' } }, 'Get AI-optimized schedules by priority level. Personalize your work hours and break times.')
                ),
                React.createElement('div', null,
                    React.createElement('p', { style: { margin: '0 0 10px 0' } }, React.createElement('strong', null, '4️⃣ Get AI Suggestions')),
                    React.createElement('p', { style: { margin: '0', color: '#a0a0b8' } }, 'Receive personalized life advice and productivity tips based on your tasks and goals.')
                )
            ),
            React.createElement('div', { style: { marginTop: '20px', padding: '15px', backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '6px', borderLeft: '4px solid #f59e0b' } },
                React.createElement('p', { style: { margin: '0', fontSize: '13px', color: '#a0a0b8' } }, 
                    '✨ Talk to your AI assistant about anything! Get planning advice, productivity tips, life guidance, and more. The more you interact, the smarter it gets!'
                )
            )
        ),

        showPlanForm && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 } },
            React.createElement('div', { style: { backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' } },
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
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#f0f0f5' } }, 'Your Name *'),
                    React.createElement('input', {
                        type: 'text',
                        value: planFormData.name,
                        onChange: (e) => setPlanFormData({ ...planFormData, name: e.target.value }),
                        placeholder: 'Enter your name',
                        style: { width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                    })
                ),

                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' } },
                    React.createElement('div', null,
                        React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#f0f0f5' } }, 'Work Start Time'),
                        React.createElement('input', {
                            type: 'time',
                            value: planFormData.workStart,
                            onChange: (e) => setPlanFormData({ ...planFormData, workStart: e.target.value }),
                            style: { width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                        })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#f0f0f5' } }, 'Work End Time'),
                        React.createElement('input', {
                            type: 'time',
                            value: planFormData.workEnd,
                            onChange: (e) => setPlanFormData({ ...planFormData, workEnd: e.target.value }),
                            style: { width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                        })
                    )
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#f0f0f5' } }, 'Break Duration (minutes)'),
                    React.createElement('input', {
                        type: 'number',
                        value: planFormData.breakDuration,
                        onChange: (e) => setPlanFormData({ ...planFormData, breakDuration: e.target.value }),
                        min: '15',
                        max: '60',
                        style: { width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
                    })
                ),

                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#f0f0f5' } }, 'Focus Area'),
                    React.createElement('select', {
                        value: planFormData.focusArea,
                        onChange: (e) => setPlanFormData({ ...planFormData, focusArea: e.target.value }),
                        style: { width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }
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
                        style: { flex: 1, padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#f0f0f5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }
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
function Header({ theme, onToggleTheme }) {
    const isDark = theme === 'dark';
    return React.createElement('header', {
        className: 'header',
        style: {
            padding: '16px 24px',
            borderBottom: '1px solid ' + (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
            backgroundColor: isDark ? 'rgba(10, 10, 15, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'
        }
    },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
            React.createElement('div', { style: { width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' } }, '\ud83e\udd16'),
            React.createElement('div', null,
                React.createElement('h1', { style: { margin: '0', fontSize: '20px', fontWeight: '800', color: isDark ? '#f0f0f5' : '#1a1a2e', letterSpacing: '-0.5px' } }, 'TaskMaster AI'),
                React.createElement('p', { style: { margin: '0', fontSize: '11px', color: isDark ? '#6b6b80' : '#8888a0', fontWeight: '500', letterSpacing: '0.5px' } }, 'Intelligent Productivity Suite')
            )
        ),
        // Theme toggle button
        React.createElement('button', {
            id: 'theme-toggle-btn',
            onClick: onToggleTheme,
            title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: isDark ? '#f0f0f5' : '#1a1a2e',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                letterSpacing: '0.3px'
            },
            onMouseEnter: function(e) {
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
                e.currentTarget.style.transform = 'scale(1.04)';
            },
            onMouseLeave: function(e) {
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'scale(1)';
            }
        },
            React.createElement('span', { style: { fontSize: '18px', lineHeight: '1', transition: 'transform 0.4s ease' } }, isDark ? '\u2600\ufe0f' : '\ud83c\udf19'),
            React.createElement('span', null, isDark ? 'Light' : 'Dark')
        )
    );
}

// ====== TAB NAVIGATION COMPONENT ======
function TabNav({ activeTab, onTabChange, theme }) {
    var isDark = theme === 'dark';
    const tabs = [
        { name: 'Dashboard', icon: '📊' },
        { name: 'Tasks', icon: '✓' },
        { name: 'Schedule', icon: '📅' },
        { name: 'Notes', icon: '📝' },
        { name: 'Workflow', icon: '⚡' },
        { name: 'Analytics', icon: '📈' },
        { name: 'Planner', icon: '📋' },
        { name: 'AI Assistant', icon: '🤖' }
    ];
    
    return React.createElement('nav', { style: { display: 'flex', borderBottom: '1px solid ' + (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'), backgroundColor: isDark ? 'rgba(10, 10, 15, 0.75)' : 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', padding: '0 24px', gap: '2px' } },
        tabs.map(tab => React.createElement('button', {
            key: tab.name,
            onClick: () => onTabChange(tab.name),
            style: {
                padding: '14px 18px',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                backgroundColor: activeTab === tab.name ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                fontSize: '13px',
                fontWeight: activeTab === tab.name ? '700' : '500',
                cursor: 'pointer',
                borderBottom: activeTab === tab.name ? '3px solid #818cf8' : '3px solid transparent',
                color: activeTab === tab.name ? '#a5b4fc' : (isDark ? '#6b6b80' : '#8888a0'),
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                letterSpacing: '0.3px',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }
        }, tab.icon + ' ' + tab.name))
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

    // Theme state with localStorage persistence
    const [theme, setTheme] = useState(function() {
        try {
            var saved = localStorage.getItem('taskmaster-theme');
            return saved || 'dark';
        } catch(e) {
            return 'dark';
        }
    });

    // Sync body class and localStorage when theme changes
    useEffect(function() {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
        }
        try {
            localStorage.setItem('taskmaster-theme', theme);
        } catch(e) { /* ignore */ }
    }, [theme]);

    const toggleTheme = function() {
        setTheme(function(prev) { return prev === 'dark' ? 'light' : 'dark'; });
    };

    const handleRefresh = () => {
        setRefreshCounter(refreshCounter + 1);
    };

    // Global Automation Engine (Background Worker)
    useEffect(() => {
        const checkAutomations = () => {
            try {
                const stored = localStorage.getItem('taskmaster_automations');
                if (!stored) return;
                const automations = JSON.parse(stored);
                const now = new Date();
                const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                
                automations.forEach(auto => {
                    if (!auto.enabled) return;
                    
                    // Time-based trigger execution logic
                    if (auto.trigger.type === 'time' && auto.trigger.value === currentTimeStr) {
                        const lastRunKey = 'last_run_' + auto.id;
                        const lastRun = localStorage.getItem(lastRunKey);
                        
                        // Prevent duplicate execution within the same minute
                        if (lastRun !== currentTimeStr) {
                            localStorage.setItem(lastRunKey, currentTimeStr);
                            
                            // Evaluate condition (mocked logic for demo purposes)
                            let conditionMet = true;
                            if (auto.condition.type === 'tasks_pending' && auto.condition.operator === '>') {
                                conditionMet = true; // Assume true for demo
                            }
                            
                            if (conditionMet) {
                                console.log(`Executing automation: ${auto.name}`);
                                
                                // Execute action
                                const actionMsg = {
                                    role: 'assistant',
                                    content: `⚡ Automation Triggered [${auto.name}]: ${auto.action.value}`,
                                    timestamp: new Date().toLocaleTimeString()
                                };
                                setFloatingMessages(prev => [...prev, actionMsg]);
                                setShowFloatingAI(true);
                                
                                // Native Notification
                                if ("Notification" in window && Notification.permission === "granted") {
                                    new Notification("TaskMaster Automation", { body: auto.action.value });
                                } else if ("Notification" in window && Notification.permission !== "denied") {
                                    Notification.requestPermission().then(permission => {
                                        if (permission === "granted") new Notification("TaskMaster Automation", { body: auto.action.value });
                                    });
                                }
                            }
                        }
                    }
                });
            } catch (err) {
                console.error("Automation Engine Error:", err);
            }
        };

        // Check automations every 20 seconds
        const interval = setInterval(checkAutomations, 20000); 
        
        // Request desktop notification permission on mount
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        
        return () => clearInterval(interval);
    }, []);

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

        fetch('https://genai-backend-1013063132017.us-central1.run.app/api/ai-chat', {
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
            case 'Analytics':
                return React.createElement(DataAnalysis, { refreshTrigger: refreshCounter, onRefresh: handleRefresh });
            case 'Planner':
                return React.createElement(ProjectPlanner, { refreshTrigger: refreshCounter, onRefresh: handleRefresh });
            case 'AI Assistant':
                return React.createElement(AIAssistant, { refreshTrigger: refreshCounter, onRefresh: handleRefresh });
            default:
                return React.createElement(Dashboard, { refreshTrigger: refreshCounter, onTabChange: handleTabChange });
        }
    };

    const isDark = theme === 'dark';
    const mainBg = isDark ? '#0a0a0f' : '#f5f7fa';
    
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: mainBg, transition: 'background-color 0.4s ease' } },
        React.createElement(Header, { theme: theme, onToggleTheme: toggleTheme }),
        React.createElement(TabNav, { activeTab: activeTab, onTabChange: (tab) => handleTabChange(tab), theme: theme }),
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
                border: '2px solid rgba(255,255,255,0.1)',
                fontSize: '24px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4), 0 0 40px rgba(99, 102, 241, 0.15)',
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
                backgroundColor: 'rgba(18, 18, 26, 0.95)',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(99, 102, 241, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1000,
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f0f0f5',
                backdropFilter: 'blur(20px)'
            }
        },
            React.createElement('div', { style: { padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#f0f0f5', fontSize: '14px' } },
                '✨ AI Assistant',
                React.createElement('button', {
                    onClick: () => setShowFloatingAI(false),
                    style: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b6b80' }
                }, '✕')
            ),
            React.createElement('div', { style: { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' } },
                floatingMessages.length === 0 && React.createElement('p', { style: { color: '#6b6b80', fontSize: '14px' } }, 'Ask me anything about your project...'),
                floatingMessages.map((msg, idx) =>
                    React.createElement('div', {
                        key: idx,
                        style: {
                            backgroundColor: msg.role === 'user' ? '#6366f1' : 'rgba(255,255,255,0.06)',
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
                floatingLoading && React.createElement('div', { style: { color: '#a0a0b8', fontSize: '13px' } }, 'AI is thinking...')
            ),
            React.createElement('div', { style: { padding: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px' } },
                React.createElement('input', {
                    type: 'text',
                    placeholder: 'Ask something...',
                    value: floatingInput,
                    onChange: (e) => setFloatingInput(e.target.value),
                    onKeyPress: (e) => e.key === 'Enter' && sendFloatingMessage(),
                    style: {
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        color: '#f0f0f5'
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
        React.createElement('footer', { style: { borderTop: '1px solid ' + (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'), padding: '20px', textAlign: 'center', color: isDark ? '#4a4a5e' : '#b0b0c0', fontSize: '12px', backgroundColor: isDark ? 'rgba(10, 10, 15, 0.75)' : 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', marginTop: '40px' } },
            React.createElement('p', { style: { margin: 0 } }, '✦ TaskMaster AI — Multi-Agent Intelligent Productivity Suite • Built with React & FastAPI')
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







