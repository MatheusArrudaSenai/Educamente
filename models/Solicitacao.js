module.exports = (sequelize, DataTypes) => {
  const Solicitacao = sequelize.define('Solicitacao', {
    // ... seus campos
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    nome: { type: DataTypes.STRING, allowNull: false },
    data_nascimento: { type: DataTypes.DATEONLY, allowNull: false },
    curso: { type: DataTypes.STRING, allowNull: false },
    turno: { type: DataTypes.ENUM('Matutino', 'Vespertino', 'Noturno'), allowNull: false },
    turma: { type: DataTypes.STRING, allowNull: false },
    telefone: { type: DataTypes.STRING },
    responsavel: { type: DataTypes.STRING },
    instituicao: { type: DataTypes.STRING },
    obser: { type: DataTypes.TEXT },
    laudo: { type: DataTypes.BOOLEAN, defaultValue: false },
    imagem: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM('Pendente', 'Aprovado', 'Rejeitado', 'Finalizado'), defaultValue: 'Pendente' },
    criado_em: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'Solicitacoes',
    timestamps: false
  });

  // ✅ Correto: definir após a declaração do modelo
  Solicitacao.associate = models => {
    
    Solicitacao.hasMany(models.Agendamento, {
      foreignKey: 'solicitacoes_id',
      as: 'agendamentos'
    });
  };

  return Solicitacao;
};
