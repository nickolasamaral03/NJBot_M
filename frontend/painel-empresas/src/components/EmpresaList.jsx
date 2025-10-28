import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import api from '../services/api';

const Container = styled.div`
  max-width: 720px;
  margin: 3rem auto;
  padding: 2rem;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 2.5rem;
  color: #1e293b;
  font-size: 1.6rem;
`;

const Input = styled.input`
  width: 96%;
  padding: 0.6rem 0.9rem;
  margin: 0.4rem 0 1rem;
  font-size: 1rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  transition: border 0.2s;

  &:focus {
    border-color: #2563eb;
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.7rem 0.9rem;
  margin: 0.4rem 0 1rem;
  font-size: 1rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  min-height: 120px;
  resize: vertical;
  transition: border 0.2s;

  &:focus {
    border-color: #2563eb;
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  }
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.9rem 0 0.5rem;
  font-weight: 500;
  color: #1f2937;
`;

const Button = styled.button`
  padding: 0.55rem 1.2rem;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background-color: #2563eb;
  color: white;
  transition: background 0.2s;
  margin-right: 0.75rem;
  margin-top: 0.5rem;

  &:hover:not(:disabled) {
    background-color: #1e40af;
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

const ButtonSecondary = styled(Button)`
  background-color: #e2e8f0;
  color: #1e293b;

  &:hover {
    background-color: #cbd5e1;
  }
`;

const ButtonDanger = styled(Button)`
  background-color: #dc2626;

  &:hover {
    background-color: #b91c1c;
  }
`;

const Item = styled.div`
  background-color: #88b4df2f;
  border: 1.5px solid #d1d5db;
  border-radius: 12px;
  padding: 1.2rem 1.5rem;
  margin-bottom: 2rem;
`;

const Strong = styled.strong`
  color: #02225cff;
  margin-bottom: 3.5rem;
  font-size: 1.3rem;
  font-family: sans-serif;
`;

const Paragraph = styled.p`
  margin: 0.3rem 0;
  color: #292424ff;
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
`;

const MessageError = styled.p`
  color: #dc2626;
  text-align: center;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const QRCodeWrapper = styled.div`
  margin-top: 1.2rem;
  text-align: center;

  p {
    margin-bottom: 0.5rem;
    color: #1f2937;
  }

  img {
    width: 200px;
    height: 200px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
`;

// Nomes dos dias da semana
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const mapHorariosToArray = (horariosMap) => {
    return DIAS_SEMANA.map((nome, index) => {
        const key = index.toString();
        const config = horariosMap[key] || { 
            inicio: '00:00', 
            fim: '00:00', 
            ativo: false,
            intervaloInicio: '12:00',
            intervaloFim: '13:00'
        };
        return { 
            id: key, 
            nome, 
            inicio: config.inicio, 
            fim: config.fim, 
            ativo: config.ativo,
            intervaloInicio: config.intervaloInicio,
            intervaloFim: config.intervaloFim
        };
    });
};

const EmpresasList = ({ empresas: propEmpresas, setEmpresas: setPropEmpresas }) => {
  const currentEmpresas = propEmpresas;
  const setEmpresasState = setPropEmpresas;

  const [qrCodes, setQrCodes] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    promptIA: '',
    botAtivo: true,
    msgBoasVindas: '',
    timeoutHumanoMinutos: 10,
    msgFechado: '', 
    horariosSemana: {}
  });
  const [erro, setErro] = useState('');
  const [loadingEmpresa, setLoadingEmpresa] = useState(null);
  const [statusBots, setStatusBots] = useState({});

  // ✅ POLLING SIMPLES
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await api.get("/bots/status");
        setStatusBots(res.data);
      } catch (err) {
        console.error("Erro ao buscar status:", err);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const iniciarEdicao = (empresa) => {
    setErro('');
    setEmpresaEditando(empresa._id);
    setFormData({
      nome: empresa.nome || '',
      telefone: empresa.telefone || '',
      promptIA: empresa.promptIA || '',
      botAtivo: empresa.botAtivo ?? true,
      msgBoasVindas: empresa.msgBoasVindas || '',
      timeoutHumanoMinutos: empresa.timeoutHumanoMinutos || 10,
      msgFechado: empresa.msgFechado || 'Olá! Nosso horário de atendimento é de [HORARIO_INICIO]h às [HORARIO_FIM]h. Retornaremos assim que possível.',
      horariosSemana: empresa.horariosSemana || {}, 
    });
  };

  const handleHorarioChange = (idDia, campo, valor) => {
    setFormData(prev => ({
        ...prev,
        horariosSemana: {
            ...prev.horariosSemana,
            [idDia]: {
                ...prev.horariosSemana[idDia],
                [campo]: valor
            }
        }
    }));
  };

  const salvarEdicao = async (idEmpresa) => {
    setErro('');

    const telefoneLimpo = formData.telefone.replace(/\D/g, '');
    const timeout = formData.timeoutHumanoMinutos ? Number(formData.timeoutHumanoMinutos) : 10;

    if (!formData.nome.trim() || !telefoneLimpo || !formData.promptIA.trim()) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }
    
    const payload = {
      nome: formData.nome.trim(),
      telefone: telefoneLimpo,
      promptIA: formData.promptIA.trim(),
      botAtivo: formData.botAtivo,
      msgBoasVindas: formData.msgBoasVindas.trim(),
      timeoutHumanoMinutos: timeout, 
      msgFechado: formData.msgFechado.trim(),
      horariosSemana: formData.horariosSemana, 
    };

    try {
      const res = await api.put(`/empresas/${idEmpresa}`, payload);
      setEmpresasState((prev) => prev.map((e) => (e._id === idEmpresa ? res.data : e)));
      setEmpresaEditando(null);
    } catch (err) {
      console.error('Erro ao editar empresa:', err);
      setErro('Erro ao salvar empresa.');
    }
  };

  const cancelarEdicao = () => {
    setEmpresaEditando(null);
    setFormData({ 
      nome: '', 
      telefone: '', 
      promptIA: '', 
      botAtivo: true,
      msgBoasVindas: '', 
      timeoutHumanoMinutos: 10,
      msgFechado: '',
      horariosSemana: {},
    });
    setErro('');
  };

  const apagarEmpresa = async (idEmpresa) => {
    const empresa = currentEmpresas.find(e => e._id === idEmpresa);
    if (!empresa) return;

    if (!window.confirm(`Excluir "${empresa.nome}"?`)) return;

    try {
      await api.delete(`/empresas/${idEmpresa}`);
      setEmpresasState((prev) => prev.filter((e) => e._id !== idEmpresa));
    } catch (err) {
      console.error('Erro ao excluir empresa:', err);
      alert('Erro ao excluir empresa.');
    }
  };

  const alternarStatusBot = async (idEmpresa) => {
    try {
      const res = await api.put(`/empresas/${idEmpresa}/toggle-bot`);
      setEmpresasState((prev) =>
        prev.map((e) =>
          e._id === idEmpresa ? { ...e, botAtivo: res.data.botAtivo } : e
        )
      );
    } catch (err) {
      console.error('Erro ao alternar status do bot:', err);
      alert('Erro ao alternar status do bot.');
    }
  };

  const gerarNovoQrCode = async (idEmpresa) => {
    try {
      setLoadingEmpresa(idEmpresa);
      const res = await api.post(`/reiniciar-bot/${idEmpresa}`);
      setQrCodes((prev) => ({ ...prev, [idEmpresa]: res.data.qrCode }));
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
      alert('Erro ao gerar QR Code.');
    } finally {
      setLoadingEmpresa(null);
    }
  };

  const empresasFiltradas = currentEmpresas.filter((empresa) =>
    empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.telefone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const horariosArray = empresaEditando ? mapHorariosToArray(formData.horariosSemana) : [];

  return (
    <Container>
      <Title>Empresas Cadastradas</Title>
      <Input
        type="text"
        placeholder="Buscar por nome ou telefone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '1.5rem' }}
      />

      {erro && <MessageError>{erro}</MessageError>}

      {empresasFiltradas.length === 0 ? (
        <Paragraph style={{ textAlign: 'center', color: '#666' }}>
          Nenhuma empresa encontrada
        </Paragraph>
      ) : (
        empresasFiltradas.map((empresa) => (
          <Item key={empresa._id}>
            {empresaEditando === empresa._id ? (
              // MODO EDIÇÃO
              <>
                <Input
                  type="text"
                  placeholder="Nome da Empresa"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
                <Input
                  type="text"
                  placeholder="Telefone (XX) XXXXX-XXXX"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
                
                <TextArea
                  placeholder="Saudação Inicial"
                  value={formData.msgBoasVindas}
                  onChange={(e) => setFormData({ ...formData, msgBoasVindas: e.target.value })}
                />
                
                <Title style={{ fontSize: '1.2rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                  Horários de Atendimento:
                </Title>
                {horariosArray.map((dia) => (
                  <div key={dia.id} style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    alignItems: 'center', 
                    marginBottom: '8px', 
                    border: dia.ativo ? '1px solid #2563eb40' : '1px solid #ccc', 
                    padding: '10px', 
                    borderRadius: '4px',
                    backgroundColor: dia.ativo ? '#f0f9ff' : '#f9fafb'
                  }}>
                    <Label style={{ width: '100px', margin: 0, fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={dia.ativo}
                        onChange={(e) => handleHorarioChange(dia.id, 'ativo', e.target.checked)}
                      />
                      {dia.nome}
                    </Label>

                    {dia.ativo ? (
                      <>
                        <Input
                          type="time"
                          value={dia.inicio}
                          onChange={(e) => handleHorarioChange(dia.id, 'inicio', e.target.value)}
                          style={{ width: '80px' }}
                        />
                        <Input
                          type="time"
                          value={dia.intervaloInicio}
                          onChange={(e) => handleHorarioChange(dia.id, 'intervaloInicio', e.target.value)}
                          style={{ width: '80px', border: '1px solid orange' }}
                        />
                        <Input
                          type="time"
                          value={dia.intervaloFim}
                          onChange={(e) => handleHorarioChange(dia.id, 'intervaloFim', e.target.value)}
                          style={{ width: '80px', border: '1px solid orange' }}
                        />
                        <Input
                          type="time"
                          value={dia.fim}
                          onChange={(e) => handleHorarioChange(dia.id, 'fim', e.target.value)}
                          style={{ width: '80px' }}
                        />
                      </>
                    ) : (
                      <span style={{ color: '#dc2626', fontSize: '0.9rem', marginLeft: '10px' }}>
                        Fechado
                      </span>
                    )}
                  </div>
                ))}
                
                <TextArea
                  placeholder="Mensagem quando Fechado"
                  value={formData.msgFechado}
                  onChange={(e) => setFormData({ ...formData, msgFechado: e.target.value })}
                  rows="3"
                  style={{ marginTop: '1rem' }}
                />

                <TextArea
                  placeholder="Prompt da IA"
                  value={formData.promptIA}
                  onChange={(e) => setFormData({ ...formData, promptIA: e.target.value })}
                />
                <Label>
                  <input
                    type="checkbox"
                    checked={formData.botAtivo}
                    onChange={(e) => setFormData({ ...formData, botAtivo: e.target.checked })}
                  />
                  Bot ativo
                </Label>
                <Button onClick={() => salvarEdicao(empresa._id)}>Salvar</Button>
                <ButtonSecondary onClick={cancelarEdicao}>Cancelar</ButtonSecondary>
              </>
            ) : (
              // MODO VISUALIZAÇÃO
              <>
                <Strong>{empresa.nome}</Strong>
                <Paragraph>Telefone: {empresa.telefone}</Paragraph>
                
                <Paragraph>
                  Saudação: {empresa.msgBoasVindas || "Olá! Bem-vindo(a)!"}
                </Paragraph>

                <Paragraph>
                  Prompt IA: {empresa.promptIA?.substring(0, 100)}...
                </Paragraph>
                
                <Label>
                  <input
                    type="checkbox"
                    checked={empresa.botAtivo}
                    onChange={() => alternarStatusBot(empresa._id)}
                  />
                  Bot ativo
                </Label>

                {/* // ✅ NO EmpresasList.js - CORRIJA a verificação do status: */}

                {/* // ✅ EXIBIÇÃO SIMPLES - MESMA LÓGICA */}
                <Paragraph>
                  Status:{" "}
                  {statusBots[empresa._id] === true ? (
                    <span style={{ color: "green", fontWeight: "bold" }}>🟢 Conectado</span>
                  ) : (
                    <span style={{ color: "red", fontWeight: "bold" }}>🔴 Desconectado</span>
                  )}
                </Paragraph>
                
                <Button
                  onClick={() => gerarNovoQrCode(empresa._id)}
                  disabled={loadingEmpresa === empresa._id}
                >
                  {loadingEmpresa === empresa._id ? 'Gerando QR Code...' : 'Gerar QR Code'}
                </Button>
                
                {qrCodes[empresa._id] && ( 
                  <QRCodeWrapper>
                    <p>QR Code para conectar:</p>
                    <img src={qrCodes[empresa._id]} alt={`QR Code - ${empresa.nome}`} />
                  </QRCodeWrapper>
                )}
                
                <Button onClick={() => iniciarEdicao(empresa)}>Editar</Button>
                <ButtonDanger onClick={() => apagarEmpresa(empresa._id)}>Excluir</ButtonDanger>
              </>
            )}
          </Item>
        ))
      )}
    </Container>
  );
};

export default EmpresasList;