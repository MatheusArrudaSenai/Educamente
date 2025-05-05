       // === Estado da Aplicação ===
        let _data = {};
        let appState = { selectedDate: new Date(), selectedDay: null, currentWeekDays: [] };
        let currentAppointmentIdInModal = null;

        // === Fallbacks COM DADOS DE EXEMPLO CORRIGIDOS ===
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const dayAfterTomorrow = new Date(today); dayAfterTomorrow.setDate(today.getDate() + 2);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() -1);

        async function carregarDadosDoBackend() {
            const hoje = new Date().toISOString().split('T')[0];
            const semana = _utils.getWeekDays(new Date());
            const start = semana[0].date.toISOString().split('T')[0];
            const end = semana[6].date.toISOString().split('T')[0];
          
            const [solicitacoes, agendamentos] = await Promise.all([
              fetch('/api/solicitacoes/pendentes').then(r => r.json()),
              fetch(`/api/agendamentos/semana?start=${start}&end=${end}`).then(r => r.json())
            ]);
            
            if (!Array.isArray(agendamentos)) throw new Error("Dados de agendamentos inválidos");

            _data.pendingRequests = solicitacoes;
            _data.todayAppointments = agendamentos.filter(a => a.date === hoje && !a.completed);
            _data.weeklyAppointments = agendamentos.filter(a => a.date !== hoje && !a.completed);
            _data.appointmentHistory = agendamentos.filter(a => a.completed);
          
            initApp(); // reinicia a interface com os dados reais
          }
          

        // Funções Utilitárias (com correção em getDisplayWeek)
        const _utils = typeof utils !== 'undefined' ? utils : {
            formatDate: (d) => d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A',
            formatTimeDisplay: (t) => t || 'N/A',
            getCurrentFormattedDate: () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            getWeekDays: (refDate) => { const week = []; const startOfWeek = new Date(refDate); startOfWeek.setDate(refDate.getDate() - refDate.getDay() + (refDate.getDay() === 0 ? -6 : 1)); for (let i = 0; i < 7; i++) { const day = new Date(startOfWeek); day.setDate(startOfWeek.getDate() + i); week.push({ date: day, shortName: day.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3).toUpperCase().replace('.', '') }); } return week; },
            getDisplayWeek: (weekDays) => {
                if (!weekDays || weekDays.length < 2) { console.warn("getDisplayWeek recebeu weekDays inválido:", weekDays); return 'Semana Inválida'; }
                try {
                    const start = weekDays[0].date; const end = weekDays[weekDays.length - 1].date; const startYear = start.getFullYear(); const endYear = end.getFullYear();
                    const startFormatted = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); const endFormatted = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                    if (startYear === endYear) { return `${startFormatted} - ${endFormatted}, ${startYear}`; }
                    else { return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric'})} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric'})}`; }
                } catch (e) { console.error("Erro em getDisplayWeek:", e); return "Erro Semana"; }
            },
            getAppointmentForTimeSlot: () => null
        };
        const _icons = typeof icons !== 'undefined' ? icons : { user: '<i class="fas fa-user fa-fw"></i>', calendar: '<i class="fas fa-calendar-alt fa-fw"></i>', clock: '<i class="fas fa-clock fa-fw"></i>', info: '<i class="fas fa-info-circle fa-fw"></i>', file: '<i class="fas fa-file-alt fa-fw"></i>', chevronRight: '<i class="fas fa-chevron-right fa-xs"></i>', birthdayCake: '<i class="fas fa-birthday-cake fa-fw"></i>', graduationCap: '<i class="fas fa-graduation-cap fa-fw"></i>', checkCircle: '<i class="fas fa-check-circle fa-fw"></i>', hourglassHalf: '<i class="fas fa-hourglass-half fa-fw"></i>', inbox: '<i class="fas fa-inbox fa-fw"></i>', checkDouble: '<i class="fas fa-check-double fa-fw"></i>', building: '<i class="fas fa-building fa-fw"></i>', phone: '<i class="fas fa-phone fa-fw"></i>', home: '<i class="fas fa-home"></i>', history: '<i class="fas fa-history"></i>', requests: '<i class="fas fa-clipboard-list"></i>', chevronLeft: '<i class="fas fa-chevron-left"></i>', plus: '<i class="fas fa-plus"></i>' };


        // === Lógica Principal ===
        

        document.addEventListener('DOMContentLoaded', async function() {
            console.log("Dashboard DEBUG: DOMContentLoaded");
            setupBasicUI();
            await carregarDadosDoBackend();
            setupGlobalEventListeners();
          });
          
          

        /** Configura UI básica (ícones navbar, dark mode inicial) */
        function setupBasicUI() {
             console.log("Dashboard DEBUG: setupBasicUI");
             try {
                 document.getElementById('icon-home').innerHTML = _icons.home || '?';
                 document.getElementById('icon-history').innerHTML = _icons.history || '?';
                 document.getElementById('icon-requests').innerHTML = _icons.requests || '?';
                 document.getElementById('icon-chevron-left').innerHTML = _icons.chevronLeft || '<';
                 document.getElementById('icon-chevron-right').innerHTML = _icons.chevronRight || '>';
                 document.getElementById('icon-plus').innerHTML = _icons.plus || '+';
             } catch (e) { console.error("Erro ao setar ícones básicos:", e); }

             const toggle = document.getElementById('toggle-dark-mode');
             if (toggle) {
                 const applyDarkMode = (isDark, initialLoad = false) => {
                     if (!initialLoad) document.body.classList.add('no-transitions');
                     document.body.classList.toggle('dark', isDark);
                     document.querySelectorAll('.card, .modal-content, .compact-appointment-item, .calendar-controls, .day-item, .summary-item, .request-item-dashboard, .detail-group, .detail-row, .modal-header, .modal-footer, .appointment-card').forEach(el => el?.classList.toggle('dark', isDark));
                     if (!initialLoad) {
                         requestAnimationFrame(() => {
                             requestAnimationFrame(() => { document.body.classList.remove('no-transitions'); });
                         });
                     }
                 };
                 const darkModePref = localStorage.getItem('darkMode') === 'enabled';
                 toggle.checked = darkModePref;
                 applyDarkMode(darkModePref, true);
                 toggle.addEventListener('change', function() {
                     const isChecked = this.checked;
                     applyDarkMode(isChecked);
                     localStorage.setItem('darkMode', isChecked ? 'enabled' : 'disabled');
                 });
             } else { console.warn("Dashboard WARNING: Toggle dark mode não encontrado."); }
        }

        /** Inicializa App */
        function initApp() {
              console.log("Dashboard DEBUG: initApp");
              try {
                  document.getElementById('welcome-date').textContent = _utils.getCurrentFormattedDate();
                  document.getElementById('welcome-name').textContent = `Olá, ${_data.currentUser?.name?.split(' ')[0] || 'Usuário'}`;
                  loadDashboardSummaries();
                  initializeWeeklyCalendar();
              } catch (error) { console.error('Erro inicialização App:', error); }
        }

        /** Configura Listeners Globais (COM LIMPEZA NO RENDER) */
        function setupGlobalEventListeners() {
            console.log("Dashboard DEBUG: setupGlobalEventListeners");
            try {
                document.getElementById('new-appointment')?.addEventListener('click', () => addAppointment(null, appState.selectedDay?.date.toISOString()));
                document.getElementById('prev-week')?.addEventListener('click', () => navigateWeek(-1));
                document.getElementById('next-week')?.addEventListener('click', () => navigateWeek(1));

                const modal = document.getElementById('appointment-modal');
                if (modal) {
                    modal.querySelector('#close-modal')?.addEventListener('click', closeAppointmentModal);
                    modal.querySelector('#close-appointment')?.addEventListener('click', closeAppointmentModal);
                    modal.querySelector('#edit-appointment')?.addEventListener('click', handleEditAppointmentClick);
                    modal.addEventListener('click', (event) => { if (event.target === modal) closeAppointmentModal(); });
                } else { console.warn("Modal não encontrado."); }

                 const calendarDaysEl = document.getElementById('calendar-days');
                 if (calendarDaysEl && !calendarDaysEl.dataset.listenerAttached) {
                     calendarDaysEl.addEventListener('click', handleCalendarDayClick);
                     calendarDaysEl.dataset.listenerAttached = 'true';
                     console.log("Dashboard DEBUG: Listener de delegação ADICIONADO a #calendar-days");
                 } else if (!calendarDaysEl) { console.warn("Elemento #calendar-days não encontrado.");}

                 // Listener para a lista de agendamentos será adicionado/removido no renderCompactTimeSlots

            } catch (error) { console.error("Erro ao configurar listeners:", error); }
        }

        // Handler para clique na lista de agendamentos
        function handleAppointmentListClick(event) {
            console.log("Dashboard DEBUG: Clique detectado em #compact-appointment-list.");
            const targetItem = event.target.closest('.compact-appointment-item');
            if (targetItem) {
                const appointmentId = parseInt(targetItem.dataset.appointmentId);
                console.log("Dashboard DEBUG: Item encontrado, ID:", appointmentId);
                if (!isNaN(appointmentId)) { viewAppointmentDetails(appointmentId); }
                else { console.warn("ID inválido ou não encontrado no item da lista."); }
            }
        }

         // Handler para clique nos dias do calendário
         function handleCalendarDayClick(event) {
             const targetButton = event.target.closest('.day-item');
             if (targetButton) {
                 const dateISO = targetButton.dataset.date;
                 const newSelectedDay = appState.currentWeekDays.find(d => d.date.toISOString() === dateISO);
                 if (newSelectedDay && newSelectedDay !== appState.selectedDay) {
                     appState.selectedDay = newSelectedDay;
                     renderCalendarUI(); // Re-renderiza tudo
                 }
             }
         }

        // --- Funções de Carregamento e Renderização (COM ÍCONES) ---
        function loadDashboardSummaries() { loadNextAppointment(); loadUrgentRequests(); loadDailySummary(); }

        function loadNextAppointment() {
            const detailsEl = document.getElementById('next-appointment-details'); const loadingEl = document.getElementById('next-appointment-loading'); const noEl = document.getElementById('no-next-appointment'); if (!detailsEl || !loadingEl || !noEl) return; loadingEl.style.display = 'block'; noEl.style.display = 'none'; detailsEl.innerHTML = ''; setTimeout(() => { try { const now = new Date(); const upcoming = [...(_data.todayAppointments || []), ...(_data.weeklyAppointments || [])] .filter(app => !app.completed && new Date(app.date) >= now) .sort((a, b) => new Date(a.date) - new Date(b.date)); const nextApp = upcoming[0]; if (nextApp) { const userIcon = _icons.user || '<i class="fas fa-user"></i>'; detailsEl.innerHTML = `<div class="summary-item"> <span class="summary-label">${_utils.formatDate(nextApp.date)} às ${_utils.formatTimeDisplay(nextApp.time)}</span> <span class="summary-value" style="display: inline-flex; align-items: center; gap: 0.4rem;">${userIcon} ${nextApp.studentName || 'N/A'}</span> </div> <div class="summary-item" style="border-bottom: none; padding-bottom: 0;"> <span class="summary-label">Tipo:</span> <span class="summary-value" style="color: var(--text-light); font-weight: normal;">${nextApp.type || 'N/A'}</span> </div> <div style="text-align: right; margin-top: 1rem;"> <button class="btn btn-sm btn-outline" onclick="viewAppointmentDetails(${nextApp.id})">Ver Detalhes</button> </div>`; } else { noEl.style.display = 'block'; } } catch(e) { console.error("Erro próximo atendimento:", e); noEl.textContent = 'Erro.'; noEl.style.display = 'block'; } finally { loadingEl.style.display = 'none'; if (document.body.classList.contains('dark')) detailsEl.querySelectorAll('.summary-item, .summary-value, .btn').forEach(el => el?.classList.toggle('dark', document.body.classList.contains('dark')));} }, 100);
        }

        async function loadUrgentRequests() {
            const listEl = document.getElementById('urgent-requests-list');
            const loadingEl = document.getElementById('urgent-requests-loading');
            const noEl = document.getElementById('no-urgent-requests');
            const countEl = document.getElementById('requests-count-summary');
            if (!listEl || !loadingEl || !noEl || !countEl) return;
          
            loadingEl.style.display = 'block';
            noEl.style.display = 'none';
            listEl.innerHTML = '';
          
            try {
              const response = await fetch('/api/solicitacoes/pendentes');
              const requests = await response.json();
          
              countEl.textContent = `${requests.length} pendente${requests.length !== 1 ? 's' : ''}`;
          
              if (requests.length === 0) {
                noEl.style.display = 'block';
              } else {
                const userIcon = _icons.user || '<i class="fas fa-user"></i>';
                listEl.innerHTML = requests.slice(0, 3).map(req => `
                  <div class="request-item-dashboard">
                    <span class="request-icon-dashboard">${userIcon}</span>
                    <div class="request-details-dashboard">
                      <span class="request-name-dashboard">${req.nome || 'N/A'}</span>
                    </div>
                    <span class="request-time">${_utils.formatDate(req.criado_em)}</span>
                  </div>
                `).join('');
              }
            } catch (e) {
              console.error("Erro solicitações recentes:", e);
              noEl.textContent = 'Erro ao carregar.';
              noEl.style.display = 'block';
            } finally {
              loadingEl.style.display = 'none';
            }
          }
          

        // --- CORRIGIDA e COM ÍCONES: loadDailySummary ---
        async function loadDailySummary() {
  const loadingEl = document.getElementById('daily-summary-loading');
  const contentEl = document.getElementById('daily-summary-content');

  loadingEl.style.display = 'block';
  contentEl.innerHTML = '';

  try {
    const res = await fetch('/api/dashboard/resumo-dia');
    const data = await res.json();

    contentEl.innerHTML = `
      <div class="summary-item">
        <span class="summary-icon"><i class="fas fa-calendar-day fa-fw"></i></span>
        <span class="summary-label">Atendimentos Hoje:</span>
        <span class="summary-value">${data.atendimentosHoje}</span>
      </div>
      <div class="summary-item">
        <span class="summary-icon"><i class="fas fa-check-double fa-fw"></i></span>
        <span class="summary-label">Concluídos Hoje:</span>
        <span class="summary-value">${data.concluidosHoje}</span>
      </div>
      <div class="summary-item">
        <span class="summary-icon"><i class="fas fa-inbox fa-fw"></i></span>
        <span class="summary-label">Novas Solicitações:</span>
        <span class="summary-value">${data.novasSolicitacoes}</span>
      </div>
    `;
  } catch (error) {
    console.error('Erro ao carregar resumo do dia:', error);
    contentEl.innerHTML = '<p class="text-center text-gray-500">Erro ao carregar resumo.</p>';
  } finally {
    loadingEl.style.display = 'none';
  }
}
        // --- FIM CORREÇÃO ---

        // --- Funções do Calendário (com indicador de agendamento e correção de listener) ---
        function initializeWeeklyCalendar() {
             const today = new Date(); appState.selectedDate = today; try { appState.currentWeekDays = _utils.getWeekDays(appState.selectedDate); if (!Array.isArray(appState.currentWeekDays) || appState.currentWeekDays.length !== 7) throw new Error("getWeekDays inválido."); const todayIndexInWeek = appState.currentWeekDays.findIndex(d => d.date.toDateString() === today.toDateString()); appState.selectedDay = (todayIndexInWeek !== -1 && today.getDay() !== 0 && today.getDay() !== 6) ? appState.currentWeekDays[todayIndexInWeek] : (appState.currentWeekDays.find(d => d.date.getDay() !== 0 && d.date.getDay() !== 6) || appState.currentWeekDays[0]); if (!appState.selectedDay) appState.selectedDay = appState.currentWeekDays[0]; renderCalendarUI(); } catch (error) { console.error("Erro ao inicializar calendário:", error); document.getElementById('calendar-days').innerHTML = '<p>Erro calendário.</p>'; document.getElementById('calendar-loading').style.display = 'none'; }
        }
        function renderCalendarUI() {
              if (!appState.selectedDay || !Array.isArray(appState.currentWeekDays)) return; const weekRangeEl = document.getElementById('week-range'); if (weekRangeEl) weekRangeEl.textContent = _utils.getDisplayWeek(appState.currentWeekDays); renderCalendarDays(appState.currentWeekDays, appState.selectedDay); renderCompactTimeSlots(appState.selectedDay);
        }
        // --- CORRIGIDA: renderCalendarDays (com title incluindo ano) ---
        function renderCalendarDays(weekDays, selectedDay) {
             const calendarDaysEl = document.getElementById('calendar-days');
             if (!calendarDaysEl) { console.error("Elemento #calendar-days não encontrado."); return; }
             try {
                 const selectedDateStr = selectedDay.date.toISOString().split('T')[0];
                 const todayDateStr = new Date().toISOString().split('T')[0];
                 const allAppointments = [ ...(_data.todayAppointments || []), ...(_data.weeklyAppointments || []), ...(_data.appointmentHistory || []) ];
                 calendarDaysEl.innerHTML = weekDays.map(day => {
                     const dayDateStr = day.date.toISOString().split('T')[0];
                     const isActive = dayDateStr === selectedDateStr;
                     const isToday = dayDateStr === todayDateStr;
                     const hasAppointments = allAppointments.some(app => app.date?.startsWith(dayDateStr));
                     const fullDateTitle = day.date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                     return `
                     <button
                         class="day-item ${isActive ? 'active' : ''} ${isToday ? 'today' : ''} ${hasAppointments ? 'has-appointments' : ''} ${document.body.classList.contains('dark') ? 'dark' : ''}"
                         data-date="${day.date.toISOString()}"
                         title="${fullDateTitle}"
                     >
                         <div class="day-name">${day.shortName}</div>
                         <div class="day-number">${day.date.getDate()}</div>
                     </button>`;
                 }).join('');
             } catch (error) { console.error("Erro renderCalendarDays:", error); calendarDaysEl.innerHTML = '<p>Erro ao renderizar dias.</p>'; }
        }
        // --- FIM CORREÇÃO ---

        // --- CORRIGIDA: renderCompactTimeSlots (com add/remove listener) ---
        function renderCompactTimeSlots(selectedDay) {
            console.log("Dashboard DEBUG: renderCompactTimeSlots for", selectedDay.date);
            const loadingEl = document.getElementById('calendar-loading');
            const listEl = document.getElementById('compact-appointment-list');
            const noEl = document.getElementById('no-appointments-for-day');
            const errorEl = document.getElementById('calendar-error');
            const wrapperEl = document.getElementById('time-slots');
            if (!loadingEl || !listEl || !noEl || !wrapperEl || !errorEl) return;

            loadingEl.style.display = 'block';
            listEl.style.display = 'none';
            noEl.style.display = 'none';
            errorEl.style.display = 'none';
            listEl.innerHTML = '';

            // Remove listener antigo para garantir que não haja duplicatas
            listEl.removeEventListener('click', handleAppointmentListClick);
            console.log("Dashboard DEBUG: Listener antigo removido de #compact-appointment-list");

            setTimeout(() => {
                try {
                    const allAppointments = [ ...(_data.todayAppointments || []), ...(_data.weeklyAppointments || []), ...(_data.appointmentHistory || []) ];
                    const selectedDateStr = selectedDay.date.toISOString().split('T')[0];
                    const dayAppointments = allAppointments
                        .filter(app => app.date?.startsWith(selectedDateStr))
                        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

                    if (dayAppointments.length === 0) {
                        noEl.style.display = 'flex';
                    } else {
                        listEl.style.display = 'block';
                        listEl.innerHTML = dayAppointments.map(appointment => {
                            const formatTime = _utils.formatTimeDisplay(appointment.time);
                            const clockIcon = _icons.clock || '<i class="fas fa-clock fa-sm"></i>';
                            const infoIcon = _icons.info || '<i class="fas fa-info-circle fa-sm"></i>';
                            const chevRightIcon = _icons.chevronRight || '<i class="fas fa-chevron-right fa-xs"></i>';
                            return `
                               <li class="compact-appointment-item ${document.body.classList.contains('dark') ? 'dark' : ''}" data-appointment-id="${appointment.id}">
                                   <span class="time">${clockIcon} ${formatTime}</span>
                                   <div class="details">
                                       <span class="name">${appointment.studentName || 'N/A'}</span>
                                       <span class="type">${infoIcon} ${appointment.type || 'N/A'}</span>
                                   </div>
                                   <span class="chevron-icon">${chevRightIcon}</span>
                               </li>`;
                        }).join('');

                        // *** ADICIONA O LISTENER AQUI, DEPOIS DE CRIAR O CONTEÚDO ***
                        listEl.addEventListener('click', handleAppointmentListClick);
                        console.log("Dashboard DEBUG: Listener ADICIONADO a #compact-appointment-list (dentro de render)");
                    }
                } catch (error) {
                    console.error("Erro renderCompactTimeSlots:", error);
                    errorEl.style.display = 'block';
                    noEl.style.display = 'none';
                } finally {
                    loadingEl.style.display = 'none';
                }
            }, 50);
        }
        // --- FIM CORREÇÃO ---

        async function navigateWeek(direction) {
            const newDate = new Date(appState.selectedDate);
            newDate.setDate(newDate.getDate() + (7 * direction));
            appState.selectedDate = newDate;
          
            try {
              appState.currentWeekDays = _utils.getWeekDays(appState.selectedDate);
              if (!Array.isArray(appState.currentWeekDays) || appState.currentWeekDays.length !== 7)
                throw new Error("getWeekDays inválido.");
          
              const firstWeekday = appState.currentWeekDays.find(d => d.date.getDay() !== 0 && d.date.getDay() !== 6) || appState.currentWeekDays[0];
              appState.selectedDay = firstWeekday;
          
              // 👉 Aqui está a correção: buscar os agendamentos da nova semana
              const start = appState.currentWeekDays[0].date.toISOString().split('T')[0];
              const end = appState.currentWeekDays[6].date.toISOString().split('T')[0];
              const agendamentos = await fetch(`/api/agendamentos/semana?start=${start}&end=${end}`).then(r => r.json());
          
              const hoje = new Date().toISOString().split('T')[0];
              _data.todayAppointments = agendamentos.filter(a => a.date === hoje && !a.completed);
              _data.weeklyAppointments = agendamentos.filter(a => a.date !== hoje && !a.completed);
              _data.appointmentHistory = agendamentos.filter(a => a.completed);
          
              renderCalendarUI(); // renderiza com os novos dados
          
            } catch (error) {
              console.error("Erro navigateWeek:", error);
            }
          }
          

        // --- Funções de Ação e Modal (COM ÍCONES NOS DETALHES e CORREÇÃO DE BUSCA DE ELEMENTOS) ---
        async function viewAppointmentDetails(id) {
            const modal = document.getElementById('appointment-modal');
            const modalBody = document.getElementById('appointment-details');
            const loadingEl = document.getElementById('modal-loading');
          
            if (!modal || !modalBody || !loadingEl) return;
          
            currentAppointmentIdInModal = id;
            modalBody.innerHTML = '';
            loadingEl.style.display = 'block';
            modal.classList.add('visible');
          
            try {
              const res = await fetch(`/api/agendamentos/${id}`);
              const data = await res.json();
          
              const formatDate = _utils.formatDate;
              const formatTime = _utils.formatTimeDisplay;
              const calculateAge = (birthDate) => {
                if (!birthDate) return '?';
                const birth = new Date(birthDate);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                return age;
              };
          
              const userIcon = _icons.user;
              const ageIcon = _icons.birthdayCake;
              const gradeIcon = _icons.graduationCap;
              const calendarIcon = _icons.calendar;
              const clockIcon = _icons.clock;
              const typeIcon = _icons.info;
              const statusIcon = data.completed ? _icons.checkCircle : _icons.hourglassHalf;
              const notesIcon = _icons.file;
          
              modalBody.innerHTML = `
                <div class="detail-group">
                  <div class="detail-group-title">Aluno</div>
                  <div class="detail-row">
                    <span class="detail-icon">
                        <i class="fas fa-user fa-fw"></i>
                    </span>
                    <div class="detail-info">
                      <span class="detail-label">Nome</span>
                      <span class="detail-value">${data.studentName}</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <span class="detail-icon">
                        <i class="fas fa-birthday-cake fa-fw"></i>
                    </span>
                    <div class="detail-info">
                      <span class="detail-label">Idade</span>
                      <span class="detail-value">${calculateAge(data.studentAge)} anos</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <span class="detail-icon">
                        <i class="fas fa-graduation-cap fa-fw"></i>
                    </span>
                    <div class="detail-info">
                      <span class="detail-label">Série/Curso</span>
                      <span class="detail-value">${data.grade}</span>
                    </div>
                  </div>
                </div>
                <div class="detail-group">
                  <div class="detail-group-title">Atendimento</div>
                  <div class="detail-row">
                    <span class="detail-icon">
                        <i class="fas fa-calendar-alt fa-fw"></i>
                    </span>
                    <div class="detail-info">
                      <span class="detail-label">Data</span>
                      <span class="detail-value">${formatDate(data.date)}</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <span class="detail-icon">
                        <i class="fas fa-clock fa-fw"></i>
                    </span>
                    <div class="detail-info">
                      <span class="detail-label">Horário</span>
                      <span class="detail-value">${formatTime(data.time)}</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <span class="detail-icon">
                        <i class="fas fa-info-circle fa-fw"></i>
                    </span>
                    <div class="detail-info">
                      <span class="detail-label">Tipo</span>
                      <span class="detail-value">${data.type}</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <span class="detail-icon">
                        <i class="fas fa-hourglass-half fa-fw"></i>
                    </span>
                    <div class="detail-info">
                      <span class="detail-label">Status</span>
                      <span class="detail-value">${data.completed ? '<span class="badge badge-success">Concluído</span>' : '<span class="badge badge-primary">Agendado</span>'}</span>
                    </div>
                  </div>
                  ${data.observations ? `
                  <div class="detail-row">
                    <span class="detail-icon">
                        <i class="fas fa-file-alt fa-fw"></i>
                    </span>
                    <div class="detail-info">
                      <span class="detail-label">Observações</span>
                      <span class="detail-value" style="white-space: pre-wrap;">${data.observations}</span>
                    </div>
                  </div>` : ''}
                </div>
              `;
          
            } catch (error) {
              console.error("Erro ao buscar detalhes:", error);
              modalBody.innerHTML = `<p style="color: red; text-align: center;">Erro ao carregar dados do atendimento.</p>`;
            } finally {
              loadingEl.style.display = 'none';
            }
          }


        function handleEditAppointmentClick() {
             if (currentAppointmentIdInModal !== null) { alert(`Edição do agendamento ID: ${currentAppointmentIdInModal} (Implementar)`); } else { console.error("Nenhum ID de agendamento ativo na modal para editar."); }
        }
        function closeAppointmentModal() {
             const modal = document.getElementById('appointment-modal'); if(modal) modal.classList.remove('visible'); currentAppointmentIdInModal = null;
        }
        function addAppointment(time, dateISO) { const dateFormatted = _utils.formatDate(dateISO); const timeFormatted = _utils.formatTimeDisplay(time); alert(`Adicionar atendimento às ${timeFormatted || '?'} em ${dateFormatted || '?'} (Implementar)`); }
        function scrollToCalendar(event) { event.preventDefault(); const calendarElement = document.getElementById('calendar'); if (calendarElement) { calendarElement.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }

        async function carregarDadosDoBackend() {
            const hoje = new Date().toISOString().split('T')[0];
            const semana = _utils.getWeekDays(new Date());
            const start = semana[0].date.toISOString().split('T')[0];
            const end = semana[6].date.toISOString().split('T')[0];
          
            try {
              const [solicitacoes, agendamentos] = await Promise.all([
                fetch('/api/solicitacoes/pendentes').then(r => r.json()),
                fetch(`/api/agendamentos/semana?start=${start}&end=${end}`).then(r => r.json())
              ]);
              const userResponse = await fetch('/api/usuario-logado');
              const userData = await userResponse.json();

              _data.pendingRequests = solicitacoes;
              _data.todayAppointments = agendamentos.filter(a => a.date === hoje && !a.completed);
              _data.weeklyAppointments = agendamentos.filter(a => a.date !== hoje && !a.completed);
              _data.appointmentHistory = agendamentos.filter(a => a.completed);
              _data.currentUser = { name: userData.nome || 'Doutora' };
          
              initApp(); // reinicia a interface
            } catch (error) {
              console.error("Erro ao carregar dados da API:", error);
            }
          }
          