const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const { Op } = require("sequelize");

const { sequelize, Usuario, Solicitacao, Agendamento, Observacao } = require('./models');
sequelize.sync({ force: false });

const app = express(); // <--- ESTAVA FALTANDO ISSO AQUI!

// Middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: 'EducaM3nte!',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Rotas de páginas HTML
app.get('/', (req, res) => res.sendFile(__dirname + "/views/index.html"));
app.get('/login_aluno', (req, res) => res.sendFile(__dirname + "/views/login_aluno.html"));
app.get('/login_professor', (req, res) => res.sendFile(__dirname + "/views/login_professor.html"));
app.get('/login_psico', (req, res) => res.sendFile(__dirname + "/views/login_psico.html"));
app.get('/cadastro', (req, res) => res.sendFile(__dirname + "/views/cadastro.html"));
app.get('/confirmar', (req, res) => res.sendFile(__dirname + "/views/confirmar_email.html"));
app.get('/formulario', (req, res) => res.sendFile(__dirname + "/views/formulario.html"));
app.get('/confirmacao', (req, res) => res.sendFile(__dirname + "/views/confirmar_envio.html"));
app.get('/painel', (req, res) => res.sendFile(__dirname + "/views/painel.html"));
app.get('/historico', (req, res) => res.sendFile(__dirname + "/views/historico.html"));
app.get('/historico_aluno', (req, res) => res.sendFile(__dirname + "/views/historico_aluno.html"));
app.get('/solicitacoes', (req, res) => res.sendFile(__dirname + "/views/solicitacoes.html"));
app.get('/agendamento', (req, res) => res.sendFile(__dirname + "/views/agendamento.html"));
app.get('/detalhes', (req, res) => res.sendFile(__dirname + "/views/detalhes.html"));
  

// Cadastro de aluno (cria em usuários)
app.post('/cadastro_aluno', async (req, res) => {
    console.log(req.body); // 👈 Isso mostra os dados enviados do formulário

    const { name, email, password,} = req.body;

    const usuarioExistente = await Usuario.findOne({ where: { email } });
        if (usuarioExistente) {
        return res.status(400).send('Este e-mail já está cadastrado.');
        }

    try {
        const usuario = await Usuario.create({
            nome:name,
            email,
            senha:password,
            tipo: 'aluno'
        });

        res.redirect('/login_aluno');
    } catch (err) {
        console.error(err); // 👈 Isso mostra o erro completo no terminal
        res.status(500).send('Erro ao cadastrar aluno.');
    }
});

//Função de login
app.post('/login', async (req, res) => {
    const { email, password, tipoEsperado } = req.body;

    try {
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario) {
            return res.status(500).send('Usuário não encontrado');
        } else if (usuario.senha !== password) {
            return res.status(500).send('Senha incorreta.');
        } else if (usuario.tipo !== tipoEsperado) {
            return res.status(400).send(`Este não é um login do tipo "${tipoEsperado}".`);
        }

        // Define o cookie com o tipo de usuário
        req.session.usuarioId = usuario.id;

        // 🔍 Apenas para depuração
        console.log("Usuário logado:", usuario.nome, "| ID:", usuario.id, "| Tipo:", usuario.tipo);

        // Define o cookie com o tipo de usuário
        res.cookie('tipoUsuario', usuario.tipo, { httpOnly: false, maxAge: 900000, secure: false });

        
        // Redireciona após login bem-sucedido
        if (usuario.tipo === 'psicopedagoga') {
            res.redirect('/painel');
          } else{
            res.redirect('/formulario');
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Erro no login.');
    }
});

app.get('/api/usuario-logado', async (req, res) => {
  try {
      const usuario = await Usuario.findByPk(req.session.usuarioId);
      if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

      res.json({ nome: usuario.nome });
  } catch (err) {
      console.error("Erro ao buscar usuário logado:", err);
      res.status(500).json({ error: 'Erro interno' });
  }
});


// Criação da pasta "uploads" caso não haja uma
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// configuração do destino e nome do arquivo
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // certifique-se de que essa pasta existe
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const nomeArquivo = Date.now() + ext;
    cb(null, nomeArquivo);
  }
});

const upload = multer({ storage });

// Envio de formulário (cria em solicitacao)
app.post('/enviar_solicitacao', upload.single('file'), async (req, res) => {
  try {
    const {
      name,
      age,
      course,
      shift,
      classroom,
      phone,
      responsible,
      institution,
      observations,
      outro_motivo,
      outro_curso,
      usuarioId = req.session.usuarioId
    } = req.body;

    const observacoes = outro_motivo?.trim() !== '' ? outro_motivo : observations;
    const cursoFinal = course === 'Outro' ? outro_curso : course;
    const imagem = req.file ? req.file.filename : null;
    const laudo = !!imagem;

    await Solicitacao.create({
      nome: name,
      data_nascimento: age,
      curso: cursoFinal,
      turno: shift,
      turma: classroom,
      telefone: phone,
      responsavel: responsible,
      instituicao: institution,
      obser: observacoes,
      laudo: laudo,
      imagem: imagem,
      usuario_id: usuarioId
    });

    res.redirect('/confirmacao');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao enviar solicitação.');
  }
});

// Rota dinâmica para servir arquivos aluno_X.html
app.get('/aluno/:id', (req, res) => {
    const alunoId = req.params.id;
    const htmlPath = path.join(__dirname, 'views', 'Alunos', `aluno_${alunoId}.html`);
    res.sendFile(htmlPath);
  });
  

// Rota API para buscar solicitações do banco de dados
app.get('/api/solicitacoes', async (req, res) => {
  try {
    const solicitacoes = await Solicitacao.findAll({
      order: [['criado_em', 'DESC']],
      include: [
        { model: Agendamento, as: 'agendamentos' }
      ]
    });

    res.json(solicitacoes);
  } catch (err) {
    console.error("Erro ao buscar solicitações:", err);
    res.status(500).json({ error: "Erro ao buscar solicitações" });
  }
});


app.get('/api/solicitacoes/pendentes', async (req, res) => {
  try {
    const pendentes = await Solicitacao.findAll({
      where: { status: 'Pendente' },
      order: [['criado_em', 'DESC']],
      limit: 5
    });
    res.json(pendentes);
  } catch (err) {
    console.error("Erro ao buscar solicitações pendentes:", err);
    res.status(500).json({ error: "Erro ao buscar pendentes" });
  }
});

// Rota API
app.get('/api/solicitacoes/:id', async (req, res) => {
    try {
      const solicitacao = await Solicitacao.findByPk(req.params.id);
      if (!solicitacao) return res.status(404).json({ error: 'Solicitação não encontrada' });
  
      res.json(solicitacao);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao buscar solicitação' });
    }
  });
  
  app.put('/solicitacoes/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
  
    try {
      await Solicitacao.update(
        { status: status },
        { where: { id: id } }
      );
      res.status(200).json({ message: 'Status atualizado com sucesso!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao atualizar o status.' });
    }
  });
  
  // Rota: /api/historico_por_id/:id
  // Rota: /api/historico_por_id/:id
app.get('/api/historico_por_id/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const solicitacao = await Solicitacao.findByPk(id, {
      include: [
        {
          model: Agendamento,
          as: 'agendamentos', 

          include: [
            {
              model: Observacao,
              as: 'observacoes', 
              order: [['criado_em', 'DESC']], 
              limit: 1 
            }
          ]
        }
      ]
    });

    if (!solicitacao) {
      return res.status(404).json({ error: "Solicitação não encontrada." });
    }

    // Mapeia os dados para o frontend
    console.log("Dados da Solicitacao (Re-check):", solicitacao);
    const aluno = {
      studentName: solicitacao.nome,
      studentAge: solicitacao.data_nascimento,
      curso: solicitacao.curso,
      grade: solicitacao.turma, 
      phone: solicitacao.telefone,
      unit: solicitacao.instituicao
    };

    const appointmentHistory = solicitacao.agendamentos.map(ag => {

    const observacaoRecente = ag.observacoes && ag.observacoes.length > 0
                                 ? ag.observacoes[0].texto 
                                 : null;
      
    const observacaoFinal = observacaoRecente || ag.obser_agendamento || '';


      return {
        id: ag.id,
        date: ag.data_agendamento,
        horario: ag.horario,
        observacao: observacaoFinal,
        type: solicitacao.obser,
        studentName: solicitacao.nome, 
        course: solicitacao.curso,
        unit: solicitacao.instituicao,
        studentAge: solicitacao.data_nascimento,
        grade: solicitacao.turma,
        phone: solicitacao.telefone
      };
    });

    console.log("Dados da Solicitacao:", solicitacao);
    console.log("Objeto Aluno enviado:", aluno);
    res.json({ aluno, appointmentHistory });

  } catch (err) {
    console.error("Erro ao buscar histórico:", err);
    res.status(500).json({ error: "Erro ao buscar histórico." });
  }
});
  
app.post('/api/observacoes', async (req, res) => {
  const { agendamentos_id, texto } = req.body;
  try {
    await Observacao.create({
      agendamentos_id,
      texto,
      criado_em: new Date()
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar observação (Sequelize):', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar observação' });
  }
});


  
  app.post('/agendar', async (req, res) => {
    try {
      const { solicitacoes_id, calendar, time, observations } = req.body;
      const dataAgendamento = calendar;
      const horarioCompleto = `${time}:00`;
  
      // 🔍 Verifica se já existe agendamento nesse dia e horário
      const agendamentoExistente = await Agendamento.findOne({
        where: {
          data_agendamento: dataAgendamento,
          horario: horarioCompleto
        }
      });
  
      if (agendamentoExistente) {
        return res.status(400).send('Já existe um agendamento nesse dia e horário.');
      }
  
      // ✅ Cria o agendamento
      await Agendamento.create({
        solicitacoes_id,
        data_agendamento: dataAgendamento,
        horario: horarioCompleto,
        obser_agendamento: observations
      });
  
      await Solicitacao.update(
        { status: 'Aprovado' },
        { where: { id: solicitacoes_id } }
      );
  
      res.redirect('/solicitacoes');
  
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      res.status(500).send('Erro ao criar agendamento.');
    }
  });
  
  app.get('/api/agendamentos/semana', async (req, res) => {
    try {
      const { start, end } = req.query; // esperados no formato YYYY-MM-DD
      const agendamentos = await Agendamento.findAll({
        where: {
          data_agendamento: {
            [Op.between]: [start, end]
          }
        },
        include: [{ model: Solicitacao, as: 'solicitacao' }],
        order: [['data_agendamento'], ['horario']]
      });
  
      const formatados = agendamentos.map(a => ({
        id: a.id,
        date: a.data_agendamento,
        time: a.horario,
        studentName: a.solicitacao?.nome,
        type: a.solicitacao?.curso,
        completed: a.solicitacao?.status === 'Finalizado'
      }));
  
      res.json(formatados);
    } catch (err) {
      console.error("Erro ao buscar agendamentos semanais:", err);
      res.status(500).json({ error: "Erro no calendário semanal" });
    }
  });
  

app.delete('/agendamentos/solicitacoes/:id', async (req, res) => {
  const solicitacoesId = req.params.id;

  try {
      await Agendamento.destroy({
          where: { solicitacoes_id: solicitacoesId }
      });
      res.sendStatus(200); // Sucesso
  } catch (error) {
      console.error('Erro ao apagar agendamento:', error);
      res.status(500).send('Erro ao apagar agendamento.');
  }
});

// Total de atendimentos e concluídos do dia
app.get('/api/dashboard/resumo-dia', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];

    const atendimentosHoje = await Agendamento.count({
      where: { data_agendamento: hoje }
    });

    const concluidosHoje = await Solicitacao.count({
      where: {
        status: 'Finalizado',
        criado_em: {
          [Op.gte]: new Date(`${hoje}T00:00:00`),
          [Op.lte]: new Date(`${hoje}T23:59:59`)
        }
      }
    });

    const novasSolicitacoes = await Solicitacao.count({
      where: {
        criado_em: {
          [Op.gte]: new Date(`${hoje}T00:00:00`),
          [Op.lte]: new Date(`${hoje}T23:59:59`)
        }
      }
    });

    res.json({ atendimentosHoje, concluidosHoje, novasSolicitacoes });
  } catch (err) {
    console.error("Erro no resumo do dia:", err);
    res.status(500).json({ error: "Erro ao buscar resumo" });
  }
});

app.get('/api/agendamentos/:id', async (req, res) => {
  try {
    const agendamento = await Agendamento.findByPk(req.params.id, {
      include: [{ model: Solicitacao, as: 'solicitacao' }]
    });

    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json({
      id: agendamento.id,
      date: agendamento.data_agendamento,
      time: agendamento.horario,
      observations: agendamento.obser_agendamento,
      studentName: agendamento.solicitacao?.nome || 'N/A',
      studentAge: agendamento.solicitacao?.data_nascimento || null,
      grade: agendamento.solicitacao?.curso || 'N/A',
      type: agendamento.solicitacao?.obser || 'N/A',
      completed: agendamento.solicitacao?.status === 'Finalizado'
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes do agendamento' });
  }
});


// Sincroniza banco de dados
sequelize.sync({ force: false })
    .then(() => console.log('Banco de dados sincronizado!'))
    .catch(err => console.error('Erro ao sincronizar o banco:', err));

app.use(express.static('public'));


// Inicia servidor/render
const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
    console.log(`Servidor pronto na porta ${PORT}...`);
});


