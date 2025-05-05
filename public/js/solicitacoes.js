// Envolve todo o código em uma IIFE para criar um escopo local e evitar poluição global
(function() {
    'use strict'; // Ativa o modo estrito para ajudar a pegar erros comuns

    // Variáveis no escopo da IIFE, acessíveis por todas as funções aqui dentro
    let allSolicitacoes = []; // Armazena todas as solicitações buscadas
    let currentSortOrder = 'desc'; // Ordem de data padrão ('desc' = mais recentes primeiro)

    // Referências a elementos do DOM (serão preenchidas quando o DOM estiver pronto)
    let tbody, searchInput, filterButtons, dropdowns, filterOptions, sortOptions, noResultsMessage, noPendingMessage;

    // --- FUNÇÕES PRINCIPAIS ---

    /**
     * Cria o HTML de uma linha (<tr>) para a tabela de solicitações.
     * @param {object} s - Objeto da solicitação.
     * @param {number} index - Índice da linha (para exibição do número).
     * @returns {HTMLElement} O elemento <tr> criado.
     */
    function createRow(s, index) {
        const status = s.status?.trim().toLowerCase() || 'pendente';
        const row = document.createElement('tr');
        row.setAttribute('data-id', s.id);
        row.setAttribute('data-status', s.status);
        row.setAttribute('data-unidade', s.instituicao);
        row.setAttribute('data-date', new Date(s.criado_em).toISOString());

        let statusClass = 'pending';
        if (status === 'aprovado') statusClass = 'approved';
        else if (status === 'rejeitado') statusClass = 'rejected';

        const formattedDate = typeof utils !== 'undefined' && utils.formatDate
            ? utils.formatDate(s.criado_em)
            : new Date(s.criado_em).toLocaleDateString('pt-BR');

        const isPendente = s.status === 'Pendente';
        const isAprovado = s.status === 'Aprovado';
        const isRejeitado = s.status === 'Rejeitado';

        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="aluno-nome">${s.nome || 'N/A'}</td>
            <td class="curso-nome">${s.curso || 'N/A'}</td>
            <td>${s.instituicao || 'N/A'}</td>
            <td>${s.telefone || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td><span class="status ${statusClass}">${s.status}</span></td>
            <td>
                <div class="action-buttons">
                    <a class="btn-sm btn-view" title="Visualizar Detalhes" href="detalhes?id=${s.id}"><i class="fas fa-eye"></i></a>
                    <button class="btn-sm btn-approve" data-id="${s.id}" title="Aprovar e Agendar" style="display: ${isPendente ? 'inline-block' : 'none'};"><i class="fas fa-check"></i></button>
                    <button class="btn-sm btn-reject" data-id="${s.id}" title="Rejeitar Solicitação" style="display: ${isPendente ? 'inline-block' : 'none'};"><i class="fas fa-times"></i></button>
                    <button class="btn-sm btn-edit" data-id="${s.id}" title="Editar/Reverter para Pendente" style="display: ${isAprovado || isRejeitado ? 'inline-block' : 'none'};"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-sm btn-finalize" data-id="${s.id}" title="Finalizar Atendimento" style="display: ${isAprovado ? 'inline-block' : 'none'};"><i class="far fa-trash-alt"></i></button>
                </div>
            </td>
        `;
        return row;
    }

    /**
     * Renderiza a tabela de solicitações, filtrando APENAS as não finalizadas,
     * aplicando a ordenação atual e mostrando mensagens apropriadas.
     * @param {Array} solicitacoesToRender - Array de solicitações a serem consideradas para renderização.
     */
    function renderTable(solicitacoesToRender) {
        if (!tbody) {
            console.error("Falha ao renderizar tabela: tbody não encontrado.");
            return;
        }
        tbody.innerHTML = '';

        const pendentesOuEmAndamento = solicitacoesToRender.filter(s => s.status !== 'Finalizado');

        pendentesOuEmAndamento.sort((a, b) => {
            const aTime = new Date(a.criado_em).getTime();
            const bTime = new Date(b.criado_em).getTime();
            return currentSortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        });

        if (pendentesOuEmAndamento.length === 0) {
            if (noResultsMessage && noPendingMessage && searchInput) {
                if (searchInput.value || getActiveFilters().status !== 'all' || getActiveFilters().unidade !== 'all') {
                    noResultsMessage.style.display = 'block';
                    noPendingMessage.style.display = 'none';
                } else {
                    noResultsMessage.style.display = 'none';
                    noPendingMessage.style.display = 'block';
                }
            }
        } else {
            if (noResultsMessage) noResultsMessage.style.display = 'none';
            if (noPendingMessage) noPendingMessage.style.display = 'none';
            pendentesOuEmAndamento.forEach((s, index) => {
                tbody.appendChild(createRow(s, index));
            });
        }
    }

    /**
     * Obtém os valores dos filtros de status e unidade selecionados atualmente.
     * @returns {object} Objeto com { status: 'valor', unidade: 'valor' }. Padrão 'all'.
     */
    function getActiveFilters() {
        const filters = { status: 'all', unidade: 'all' };
        if (filterButtons) {
            filterButtons.forEach(btn => {
                const controlId = btn.dataset.controls;
                const selectedValue = btn.dataset.selectedValue;
                if (controlId === 'status-dropdown' && selectedValue) {
                    filters.status = selectedValue;
                } else if (controlId === 'unidade-dropdown' && selectedValue) {
                    filters.unidade = selectedValue;
                }
            });
        }
        return filters;
    }

    /**
     * Filtra o array `allSolicitacoes` com base nos filtros ativos e no termo de busca,
     * e então chama `renderTable` para exibir os resultados.
     */
    function filterAndSearchRows() {
        const term = searchInput?.value.toLowerCase().trim() ?? '';
        const { status, unidade } = getActiveFilters();

        const filtered = allSolicitacoes.filter(s => {
            const matchSearch = !term || (s.nome?.toLowerCase().includes(term) || s.curso?.toLowerCase().includes(term));
            const matchStatus = status === 'all' || s.status === status;
            const matchUnidade = unidade === 'all' || s.instituicao === unidade;
            return matchSearch && matchStatus && matchUnidade;
        });

        renderTable(filtered);
    }

    /**
     * Altera o status de uma solicitação via API e atualiza a interface.
     * @param {number} id - ID da solicitação.
     * @param {string} novoStatus - O novo status ('Pendente', 'Aprovado', 'Rejeitado', 'Finalizado').
     */
    async function alterarStatus(id, novoStatus) {
        console.log(`[JS Solicitações] Alterando status para ${novoStatus} para ID: ${id}`);
        try {
            const res = await fetch(`/solicitacoes/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: novoStatus })
            });

            if (res.ok) {
                console.log(`[JS Solicitações] Status alterado com sucesso no backend.`);
                allSolicitacoes = allSolicitacoes.map(s =>
                    s.id === id ? { ...s, status: novoStatus, atualizado_em: new Date().toISOString() } : s
                );
                filterAndSearchRows(); // Re-renderiza tabela de pendentes

                // ### REMOVIDO: alert() de sucesso ###

                if (novoStatus === 'Finalizado') {
                    if (typeof loadCompletedRequests === 'function') {
                        console.log("[JS Solicitações] Status -> Finalizado. Chamando loadCompletedRequests().");
                        loadCompletedRequests();
                    } else {
                         console.warn("[JS Solicitações] Função loadCompletedRequests() não encontrada para atualizar aba finalizadas.");
                    }
                }

            } else {
                const errorText = await res.text();
                console.error(`[JS Solicitações] Erro ${res.status} ao atualizar status:`, errorText);
                alert(`Erro ao atualizar status (${res.status}): ${errorText || 'Tente novamente.'}`); // Manter alert de erro
            }
        } catch (err) {
            console.error('[JS Solicitações] Erro de rede/fetch ao alterar status:', err);
            alert('Erro de comunicação ao tentar atualizar o status. Verifique a conexão.'); // Manter alert de erro
        }
    }

    /**
     * Busca os dados mais recentes da API, atualiza `allSolicitacoes` e re-renderiza a tabela de pendentes.
     */
    async function fetchDataAndRender() {
        console.log("[JS Solicitações] Buscando/Atualizando dados da API...");
        try {
            const res = await fetch('/api/solicitacoes');
            if (!res.ok) {
                throw new Error(`Erro HTTP ${res.status} ao buscar dados.`);
            }
            allSolicitacoes = await res.json();
            console.log(`[JS Solicitações] ${allSolicitacoes.length} solicitações carregadas/atualizadas.`);
            filterAndSearchRows();
        } catch (err) {
            console.error('[JS Solicitações] Erro ao carregar/atualizar dados:', err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">Falha ao carregar/atualizar dados.</td></tr>`;
            if (noPendingMessage) noPendingMessage.style.display = 'none';
            if (noResultsMessage) noResultsMessage.style.display = 'none';
        }
    }


    // --- INICIALIZAÇÃO E LISTENERS DE EVENTOS (Quando o DOM estiver pronto) ---

    document.addEventListener('DOMContentLoaded', () => {
        console.log("[JS Solicitações] DOMContentLoaded - Inicializando...");

        tbody = document.getElementById('solicitacoes-tbody');
        searchInput = document.getElementById('search-input');
        filterButtons = document.querySelectorAll('.filter-button');
        dropdowns = document.querySelectorAll('.filter-dropdown');
        filterOptions = document.querySelectorAll('.filter-option');
        sortOptions = document.querySelectorAll('.sort-option');
        noResultsMessage = document.getElementById('no-results-message');
        noPendingMessage = document.getElementById('no-pending');

        if (!tbody) console.error("Elemento tbody '#solicitacoes-tbody' não encontrado!");
        if (!searchInput) console.warn("Elemento '#search-input' não encontrado.");

        // Ações nos botões da tabela (COM CONFIRM() REMOVIDOS)
        if (tbody) {
            tbody.addEventListener('click', e => {
                const button = e.target.closest('button[data-id]');
                if (!button) return;

                const id = parseInt(button.dataset.id);

                if (button.classList.contains('btn-approve')) {
                    console.log(`[Ação Tabela] Aprovar ID: ${id}. Redirecionando...`);
                    window.location.href = `/agendamento?id=${id}`;
                } else if (button.classList.contains('btn-reject')) {
                    console.log(`[Ação Tabela] Rejeitar ID: ${id}.`);
                    // ### REMOVIDO: Confirmação ###
                    alterarStatus(id, 'Rejeitado');
                } else if (button.classList.contains('btn-edit')) {
                    console.log(`[Ação Tabela] Editar (Reverter) ID: ${id}.`);
                    // ### REMOVIDO: Confirmação ###
                    fetch(`/agendamentos/solicitacoes/${id}`, { method: 'DELETE' })
                        .then(response => {
                            if (response.ok || response.status === 404) {
                                console.log(`[Ação Edit] Agendamento para ID ${id} verificado/removido.`);
                            } else {
                                console.warn(`[Ação Edit] Resposta não OK ao tentar remover agendamento: ${response.status}`);
                            }
                        })
                        .catch(error => console.error("[Ação Edit] Erro ao tentar remover agendamento:", error))
                        .finally(() => {
                            alterarStatus(id, 'Pendente');
                        });
                } else if (button.classList.contains('btn-finalize')) {
                    console.log(`[Ação Tabela] Finalizar ID: ${id}.`);
                     // ### REMOVIDO: Confirmação ###
                    alterarStatus(id, 'Finalizado');
                }
            });
        }

        // Listeners de Filtros e Ordenação (Inalterados)
        if (filterOptions) {
            filterOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                     e.preventDefault();
                     const dropdown = option.closest('.filter-dropdown');
                     const btn = dropdown?.previousElementSibling;
                     if (btn && dropdown) {
                         const filterType = option.dataset.filterType;
                         const filterValue = option.dataset.filterValue;
                         btn.querySelector('span').textContent = option.textContent;
                         btn.dataset.selectedValue = filterValue;
                         dropdown.classList.remove('active');
                         btn.classList.remove('active');
                         console.log(`[Filtro Aplicado] ${filterType}: ${filterValue}`);
                         filterAndSearchRows();
                     }
                });
            });
        }

        if (filterButtons) {
            filterButtons.forEach(button => {
                button.addEventListener('click', e => {
                     e.stopPropagation();
                     const controlsId = button.dataset.controls;
                     const targetDropdown = document.getElementById(controlsId);
                     const isActive = button.classList.contains('active');
                     if(dropdowns) dropdowns.forEach(d => { if(d.id !== controlsId) d.classList.remove('active'); });
                     if(filterButtons) filterButtons.forEach(b => { if(b !== button) b.classList.remove('active'); });
                     if (targetDropdown) targetDropdown.classList.toggle('active', !isActive);
                     button.classList.toggle('active', !isActive);
                });
            });
         }

        if (sortOptions) {
             sortOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                     e.preventDefault();
                     const dropdown = option.closest('.filter-dropdown');
                     const btn = dropdown?.previousElementSibling;
                     if(btn && dropdown) {
                         currentSortOrder = option.dataset.sortOrder;
                         btn.querySelector('span').textContent = option.textContent;
                         dropdown.classList.remove('active');
                         btn.classList.remove('active');
                         console.log(`[Ordenação Aplicada] Ordem: ${currentSortOrder}`);
                         filterAndSearchRows();
                     }
                });
            });
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-button') && !e.target.closest('.filter-dropdown')) {
                if(dropdowns) dropdowns.forEach(d => d.classList.remove('active'));
                if(filterButtons) filterButtons.forEach(b => b.classList.remove('active'));
            }
        });

        if (searchInput) {
            searchInput.addEventListener('input', filterAndSearchRows);
        }

        fetchDataAndRender(); // Carga inicial

        console.log("[JS Solicitações] Inicialização completa.");

    }); // Fim do DOMContentLoaded


   
    function initializeSolicitacoes() {
        console.log("[Global initializeSolicitacoes] Solicitado recarregamento de dados e renderização.");
        fetchDataAndRender(); // Re-executa a busca e renderização
    }

    
    window.initializeSolicitacoes = initializeSolicitacoes;

})(); 