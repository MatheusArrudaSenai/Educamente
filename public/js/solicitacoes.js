document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('solicitacoes-tbody');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-button');
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    const filterOptions = document.querySelectorAll('.filter-option');
    const sortOptions = document.querySelectorAll('.sort-option');

    let allSolicitacoes = [];

 // Função para renderizar uma linha na tabela
 function createRow(s, index) {
    const status = s.status?.trim().toLowerCase(); // normaliza
    const row = document.createElement('tr');
    row.setAttribute('data-status', s.status);
    row.setAttribute('data-unidade', s.instituicao);
    row.setAttribute('data-date', new Date(s.criado_em).toISOString());
    let statusClass = 'pending';

    if (status === 'aprovado') statusClass = 'approved';
    else if (status === 'rejeitado') statusClass = 'rejected';
    else if (status === 'finalizado') statusClass = 'finalized';


    const formattedDate = typeof utils !== 'undefined' && utils.formatDate
        ? utils.formatDate(s.criado_em)
        : new Date(s.criado_em).toLocaleDateString('pt-BR');

        const isPendente = s.status === 'Pendente';
        const isAprovado = s.status === 'Aprovado';
        const isRejeitado = s.status === 'Rejeitado';
        const isFinalizado = s.status === 'Finalizado';

        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="aluno-nome">${s.nome}</td>
            <td class="curso-nome">${s.curso}</td>
            <td>${s.instituicao}</td>
            <td>${s.telefone}</td>
            <td>${formattedDate}</td>
            <td><span class="status ${statusClass}">${s.status}</span></td>
            <td>
                <div class="action-buttons">
                    <a class="btn-sm btn-view" title="Visualizar" href="detalhes?id=${s.id}"><i class="fas fa-eye"></i></a>
                    <button class="btn-sm btn-approve" data-id="${s.id}" title="Aprovar" style="display: ${isPendente ? '' : 'none'};"><i class="fas fa-check"></i></button>
                    <button class="btn-sm btn-reject" data-id="${s.id}" title="Rejeitar" style="display: ${isPendente ? '' : 'none'};"><i class="fas fa-times"></i></button>
                    <button class="btn-sm btn-edit" data-id="${s.id}" title="Editar" style="display: ${isAprovado || isRejeitado ? '' : 'none'};"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-sm btn-finalize" data-id="${s.id}" title="Finalizar" style="display: ${isAprovado ? '' : 'none'};"><i class="far fa-trash-alt"></i></button>
                </div>
            </td>
        `;        
    return row;
}

    // Recarrega a tabela com base nas solicitações atuais
    function renderTable(solicitacoes) {
        tbody.innerHTML = '';
        const pendentes = solicitacoes.filter(s => s.status !== 'Finalizado');
        pendentes.forEach((s, index) => {
            tbody.appendChild(createRow(s, index));
        });
    }

    // Filtros ativos
    function getActiveFilters() {
        const filters = { status: 'all', unidade: 'all' };
      
        document.querySelectorAll('.filter-button').forEach(btn => {
          const controlId = btn.dataset.controls;
      
          if (controlId === 'status-dropdown') {
            filters.status = btn.dataset.selectedValue || 'all';
          } else if (controlId === 'unidade-dropdown') {
            filters.unidade = btn.dataset.selectedValue || 'all';
          }
          // dropdown de data é ignorado (pois não é um filtro direto, mas ordenação)
        });
             
        return filters;
      }      

    // Aplica filtros e busca
    function filterRows() {
        const term = searchInput?.value.toLowerCase().trim() ?? '';
        const { status, unidade } = getActiveFilters();

        const filtered = allSolicitacoes.filter(s => {
            const matchSearch = s.nome.toLowerCase().includes(term) || s.curso.toLowerCase().includes(term);
            const matchStatus = status === 'all' || s.status === status;
            const matchUnidade = unidade === 'all' || s.instituicao === unidade;
            return matchSearch && matchStatus && matchUnidade;
        });

        renderTable(filtered);
    }

    // Ordena linhas da tabela
    function sortRows(order) {
        const sorted = [...allSolicitacoes].sort((a, b) => {
            const aTime = new Date(a.criado_em).getTime();
            const bTime = new Date(b.criado_em).getTime();
            return order === 'asc' ? aTime - bTime : bTime - aTime;
        });
        renderTable(sorted);
    }

    // Atualiza status no backend e no array local
    async function alterarStatus(id, novoStatus) {
        try {
            const res = await fetch(`/solicitacoes/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: novoStatus })
            });
            if (res.ok) {
                allSolicitacoes = allSolicitacoes.map(s => s.id === id ? { ...s, status: novoStatus } : s);
                // NÃO chamar filterRows() aqui diretamente
                renderTable(allSolicitacoes); // Redesenha com lógica atualizada de botões
                alert(`Status alterado para ${novoStatus}`);
            }else {
                alert('Erro ao atualizar status');
            }
        } catch (err) {
            console.error(err);
            alert('Erro na comunicação com o servidor.');
        }
    }



 // Ações dos botões de linha
 tbody.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button || !button.dataset.id) return;

    const id = parseInt(button.dataset.id);
    const row = button.closest('tr');
    const approveBtn = row.querySelector('.btn-approve');
    const rejectBtn = row.querySelector('.btn-reject');
    const editBtn = row.querySelector('.btn-edit');
    const finalizeBtn = row.querySelector('.btn-finalize');

    if (button.classList.contains('btn-approve')) {
        window.location.href = `/agendamento?id=${id}`;
    return;
    } else if (button.classList.contains('btn-reject')) {
        alterarStatus(id, 'Rejeitado');
        approveBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
        editBtn.style.display = '';       // Mostrar editar
        finalizeBtn.style.display = 'none'; // Finalizar não aparece após rejeitar
    } else if (button.classList.contains('btn-edit')) {
        // Apaga o agendamento relacionado
        fetch(`/agendamentos/solicitacoes/${id}`, {
            method: 'DELETE'
        }).then(response => {
            if (!response.ok) throw new Error("Erro ao apagar agendamento");
            console.log("Agendamento apagado com sucesso.");
        }).catch(error => {
            console.error("Erro ao apagar agendamento:", error);
        });
    
        // Altera status da solicitação
        alterarStatus(id, 'Pendente');
        editBtn.style.display = 'none';
        finalizeBtn.style.display = 'none';
        approveBtn.style.display = '';
        rejectBtn.style.display = '';
    }
    
    
     else if (button.classList.contains('btn-finalize')) {
        alterarStatus(id, 'Finalizado');

        // Mover linha da tabela principal para a tabela de finalizados
        row.remove(); // Remove da tabela atual

        const finalizadosTbody = document.getElementById('solicitacoes-finalizadas');
        if (finalizadosTbody) {
            finalizadosTbody.appendChild(row); // Adiciona à tabela de finalizados
        }
    }
});


    // Listeners de filtros
    filterOptions.forEach(option => {
        option.addEventListener('click', () => {
            const btn = option.closest('.filter-dropdown')?.previousElementSibling;
            if (btn) {
                btn.dataset.selectedValue = option.dataset.filterValue;
                btn.querySelector('span').textContent = option.textContent;
            }
            filterRows();
        });
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            dropdowns.forEach(d => d.classList.remove('active'));
            button.classList.toggle('active');
            document.getElementById(button.dataset.controls).classList.toggle('active');
        });
    });

    sortOptions.forEach(option => {
        option.addEventListener('click', () => {
            sortRows(option.dataset.sortOrder);
        });
    });

    document.addEventListener('click', () => {
        dropdowns.forEach(d => d.classList.remove('active'));
        filterButtons.forEach(b => b.classList.remove('active'));
    });

    if (searchInput) searchInput.addEventListener('input', filterRows);

    // Fetch inicial
    try {
        const res = await fetch('/api/solicitacoes');
        allSolicitacoes = await res.json();
        filterRows();
    } catch (err) {
        console.error('Erro ao carregar solicitações:', err);
        tbody.innerHTML = '<tr><td colspan="8">Erro ao carregar dados.</td></tr>';
    }
});

function initializeSolicitacoes() {
    fetch('/api/solicitacoes')
        .then(res => res.json())
        .then(data => {
            allSolicitacoes = data;
            filterRows(); // atualiza a tabela na aba Pendentes
        })
        .catch(err => {
            console.error('Erro ao recarregar solicitações:', err);
        });
}

window.initializeSolicitacoes = initializeSolicitacoes;






