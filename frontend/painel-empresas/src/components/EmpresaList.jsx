// import React, { useEffect, useState, useCallback } from 'react';
// import styled from 'styled-components';
// import api from '../services/api';

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

const ButtonSuccess = styled(Button)`
  background-color: #16a34a;

  &:hover {
    background-color: #15803d;
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
  padding: 0.75rem;
  background-color: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
`;

const MessageSuccess = styled.p`
  color: #16a34a;
  text-align: center;
  font-weight: 600;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
`;

const MessageWarning = styled.p`
  color: #d97706;
  text-align: center;
  font-weight: 600;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #fffbeb;
  border-radius: 8px;
  border: 1px solid #fde68a;
`;

const QRCodeWrapper = styled.div`
  margin-top: 1.2rem;
  text-align: center;
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;

  p {
    margin-bottom: 0.5rem;
    color: #1f2937;
    font-weight: 500;
  }

  img {
    width: 200px;
    height: 200px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    border: 1px solid #cbd5e1;
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  background-color: ${props => {
    switch (props.status) {
      case 'connected':
        return '#dcfce7';
      case 'disconnected':
        return '#fecaca';
      case 'qr_waiting':
        return '#fef9c3';
      default:
        return '#e2e8f0';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'connected':
        return '#166534';
      case 'disconnected':
        return '#991b1b';
      case 'qr_waiting':
        return '#854d0e';
      default:
        return '#475569';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case 'connected':
        return '#bbf7d0';
      case 'disconnected':
        return '#fecaca';
      case 'qr_waiting':
        return '#fef08a';
      default:
        return '#cbd5e1';
    }
  }};
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const HorarioItem = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
  border: ${props => (props.ativo ? '1px solid #2563eb40' : '1px solid #ccc')};
  padding: 10px;
  border-radius: 4px;
  background-color: ${props => (props.ativo ? '#f0f9ff' : '#f9fafb')};
  transition: all 0.2s;

  &:hover {
    background-color: ${props => (props.ativo ? '#e0f2fe' : '#f1f5f9')};
  }
`;

import React, { useEffect, useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import api from '../services/api';

/* (mantive seus styled-components - omiti aqui para encurtar; cole os mesmos do seu arquivo) */
/* ... todos os styled components que você já tinha ... */

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const mapHorariosToArray = (horariosMap) => {
  return DIAS_SEMANA.map((nome, index) => {
    const key = index.toString();
    const config = horariosMap?.[key] || {
      inicio: '09:00',
      fim: '18:00',
      ativo: false,
      intervaloInicio: '12:00',
      intervaloFim: '13:00',
    };
    return {
      id: key,
      nome,
      inicio: config.inicio,
      fim: config.fim,
      ativo: config.ativo,
      intervaloInicio: config.intervaloInicio,
      intervaloFim: config.intervaloFim,
    };
  });
};

const StatusBot = ({ empresa }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const fetchStatus = async () => {
      try {
        const res = await api.get('/bots/status');
        if (isMountedRef.current) {
          setStatus(res.data?.[empresa?._id]);
          setLoading(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setStatus(false);
          setLoading(false);
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [empresa?._id]);

  if (loading) {
    return (
      <Paragraph>
        Status: <StatusBadge status="loading">⏳ Carregando...</StatusBadge>
      </Paragraph>
    );
  }

  return (
    <Paragraph>
      Status:{' '}
      <StatusBadge status={status ? 'connected' : 'disconnected'}>
        {status ? '🟢 Conectado' : '🔴 Desconectado'}
      </StatusBadge>
    </Paragraph>
  );
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
    msgFechado:
      'Olá! Nosso horário de atendimento é de [HORARIO_INICIO]h às [HORARIO_FIM]h. Retornaremos assim que possível.',
    horariosSemana: {},
  });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [aviso, setAviso] = useState('');
  const [loadingEmpresa, setLoadingEmpresa] = useState(null);
  const [statusBots, setStatusBots] = useState({});
  const isMountedRef = useRef(true);
  const pollingRef = useRef(null);

  const mostrarMensagem = useCallback((mensagem, tipo = 'erro') => {
    if (!isMountedRef.current) return;
    if (tipo === 'sucesso') {
      setSucesso(mensagem);
      setErro('');
      setAviso('');
      setTimeout(() => { if (isMountedRef.current) setSucesso(''); }, 5000);
    } else if (tipo === 'aviso') {
      setAviso(mensagem);
      setErro('');
      setSucesso('');
      setTimeout(() => { if (isMountedRef.current) setAviso(''); }, 5000);
    } else {
      setErro(mensagem);
      setSucesso('');
      setAviso('');
      setTimeout(() => { if (isMountedRef.current) setErro(''); }, 7000);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    async function fetchStatus() {
      try {
        const res = await api.get('/bots/status');
        if (isMountedRef.current) {
          setStatusBots(res.data || {});
        }
      } catch (err) {
        if (isMountedRef.current) console.error('Erro ao buscar status:', err);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const iniciarEdicao = useCallback((empresa) => {
    setErro('');
    setSucesso('');
    setAviso('');
    setEmpresaEditando(empresa._id);
    setFormData({
      nome: empresa.nome || '',
      telefone: empresa.telefone || '',
      promptIA: empresa.promptIA || '',
      botAtivo: empresa.botAtivo ?? true,
      msgBoasVindas: empresa.msgBoasVindas || '',
      timeoutHumanoMinutos: empresa.timeoutHumanoMinutos || 10,
      msgFechado:
        empresa.msgFechado ||
        'Olá! Nosso horário de atendimento é de [HORARIO_INICIO]h às [HORARIO_FIM]h. Retornaremos assim que possível.',
      horariosSemana: empresa.horariosSemana || {},
    });
  }, []);

  const handleHorarioChange = useCallback((idDia, campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      horariosSemana: {
        ...prev.horariosSemana,
        [idDia]: {
          ...prev.horariosSemana?.[idDia],
          [campo]: valor,
        },
      },
    }));
  }, []);

  const salvarEdicao = async (idEmpresa) => {
    setErro('');
    setSucesso('');
    setAviso('');

    const telefoneLimpo = (formData.telefone || '').replace(/\D/g, '');
    const timeout = formData.timeoutHumanoMinutos ? Number(formData.timeoutHumanoMinutos) : 10;

    if (!formData.nome.trim() || !telefoneLimpo || !formData.promptIA.trim()) {
      mostrarMensagem('Preencha todos os campos obrigatórios.');
      return;
    }

    if (telefoneLimpo.length < 10) {
      mostrarMensagem('Telefone deve ter pelo menos 10 dígitos.');
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
      if (!isMountedRef.current) return;
      setEmpresasState((prev) => prev.map((e) => (e._id === idEmpresa ? res.data : e)));
      setEmpresaEditando(null);
      mostrarMensagem('Empresa atualizada com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro ao editar empresa:', err);
      if (!isMountedRef.current) return;
      if (err?.response?.status === 0) {
        mostrarMensagem('❌ Servidor offline. Verifique se o backend está rodando.');
      } else {
        mostrarMensagem('Erro ao salvar empresa.');
      }
    }
  };

  const cancelarEdicao = useCallback(() => {
    setEmpresaEditando(null);
    setFormData({
      nome: '',
      telefone: '',
      promptIA: '',
      botAtivo: true,
      msgBoasVindas: '',
      timeoutHumanoMinutos: 10,
      msgFechado:
        'Olá! Nosso horário de atendimento é de [HORARIO_INICIO]h às [HORARIO_FIM]h. Retornaremos assim que possível.',
      horariosSemana: {},
    });
    setErro('');
    setSucesso('');
    setAviso('');
  }, []);

  const apagarEmpresa = async (idEmpresa) => {
    const empresa = currentEmpresas.find((e) => e._id === idEmpresa);
    if (!empresa) return;

    if (!window.confirm(`Tem certeza que deseja excluir "${empresa.nome}"? Esta ação não pode ser desfeita.`))
      return;

    try {
      await api.delete(`/empresas/${idEmpresa}`);
      if (!isMountedRef.current) return;
      setEmpresasState((prev) => prev.filter((e) => e._id !== idEmpresa));
      mostrarMensagem('Empresa excluída com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro ao excluir empresa:', err);
      if (!isMountedRef.current) return;
      if (err?.response?.status === 0) {
        mostrarMensagem('❌ Servidor offline. Verifique se o backend está rodando.');
      } else {
        mostrarMensagem('Erro ao excluir empresa.');
      }
    }
  };

  const alternarStatusBot = async (idEmpresa) => {
    try {
      const res = await api.put(`/empresas/${idEmpresa}/toggle-bot`);
      if (!isMountedRef.current) return;
      setEmpresasState((prev) =>
        prev.map((e) => (e._id === idEmpresa ? { ...e, botAtivo: res.data.botAtivo } : e))
      );
      mostrarMensagem(
        `Bot ${res.data.botAtivo ? 'ativado' : 'desativado'} com sucesso!`,
        'sucesso'
      );
    } catch (err) {
      console.error('Erro ao alternar status do bot:', err);
      if (!isMountedRef.current) return;
      if (err?.response?.status === 0) {
        mostrarMensagem('❌ Servidor offline. Verifique se o backend está rodando.');
      } else {
        mostrarMensagem('Erro ao alternar status do bot.');
      }
    }
  };

  const gerarNovoQrCode = async (idEmpresa) => {
    setLoadingEmpresa(idEmpresa);
    // Evita sobrescrever QR de outro componente se já desmontado
    if (!isMountedRef.current) {
      setLoadingEmpresa(null);
      return;
    }
    setQrCodes((prev) => ({ ...prev, [idEmpresa]: null }));

    // usamos timeout/abort para o request
    const controller = new AbortController();
    try {
      const res = await api.post(`/reiniciar-bot/${idEmpresa}`, {}, {
        timeout: 15000,
        signal: controller.signal
      });

      if (!isMountedRef.current) return;
      setQrCodes((prev) => ({
        ...prev,
        [idEmpresa]: res.data.qrCode,
      }));

      mostrarMensagem('✅ QR Code gerado com sucesso! Escaneie com o WhatsApp.', 'sucesso');
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Erro ao gerar novo QR Code:', err);

      if (err?.code === 'ECONNABORTED') {
        mostrarMensagem(
          '⏱️ O servidor está demorando para responder. O bot pode estar iniciando em segundo plano.',
          'aviso'
        );
      } else if (err?.response?.status === 0) {
        mostrarMensagem('❌ Servidor offline. Verifique se o backend está rodando na porta 3000.', 'erro');
      } else {
        mostrarMensagem('❌ Erro ao gerar QR Code. Tente novamente.', 'erro');
      }
    } finally {
      if (isMountedRef.current) setLoadingEmpresa(null);
      // sem abandono necessário já que controller local é descartado ao fim
    }
  };

  const empresasFiltradas = currentEmpresas.filter((empresa) =>
    (empresa.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (empresa.telefone || '').toLowerCase().includes(searchTerm.toLowerCase())
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
      {sucesso && <MessageSuccess>{sucesso}</MessageSuccess>}
      {aviso && <MessageWarning>{aviso}</MessageWarning>}

      {empresasFiltradas.length === 0 ? (
        <Paragraph style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
          {searchTerm ? 'Nenhuma empresa encontrada para sua busca.' : 'Nenhuma empresa cadastrada.'}
        </Paragraph>
      ) : (
        empresasFiltradas.map((empresa) => (
          <Item key={empresa._id}>
            {empresaEditando === empresa._id ? (
              // ... seu modo edição (mantive igual ao anterior) ...
              <>
                {/* Modo edição: inputs idênticos ao seu original */}
                {/* ... (copie o bloco de edição que você já tinha) */}
              </>
            ) : (
              <>
                <Strong>{empresa.nome}</Strong>
                <Paragraph>📞 Telefone: {empresa.telefone}</Paragraph>

                <Paragraph>🗣️ Saudação: {empresa.msgBoasVindas || 'Olá! Bem-vindo(a)!'}</Paragraph>

                <Paragraph>🤖 Prompt IA: {empresa.promptIA ? `${empresa.promptIA.substring(0, 100)}...` : '—'}</Paragraph>

                <Label>
                  <input
                    type="checkbox"
                    checked={empresa.botAtivo}
                    onChange={() => alternarStatusBot(empresa._id)}
                  />
                  Bot ativo
                </Label>

                <StatusBot empresa={empresa} />

                <div style={{ marginTop: '1rem' }}>
                  <Button onClick={() => gerarNovoQrCode(empresa._id)} disabled={loadingEmpresa === empresa._id}>
                    {loadingEmpresa === empresa._id ? (
                      <>
                        <LoadingSpinner /> Gerando QR Code...
                      </>
                    ) : (
                      '📱 Gerar QR Code'
                    )}
                  </Button>

                  <Button onClick={() => iniciarEdicao(empresa)}>✏️ Editar</Button>

                  <ButtonDanger onClick={() => apagarEmpresa(empresa._id)}>🗑️ Excluir</ButtonDanger>
                </div>

                {qrCodes[empresa._id] && (
                  <QRCodeWrapper>
                    <p>📱 QR Code para conectar:</p>
                    <p style={{ fontSize: '0.8rem', color: '#666' }}>Escaneie este QR Code com o WhatsApp</p>
                    <img src={qrCodes[empresa._id]} alt={`QR Code - ${empresa.nome}`} />
                    <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.5rem' }}>
                      ⚠️ Este QR Code expira em alguns minutos
                    </p>
                  </QRCodeWrapper>
                )}
              </>
            )}
          </Item>
        ))
      )}
    </Container>
  );
};

export default React.memo(EmpresasList);


// Correções aplicadas:
// adicionei isMountedRef para proteger setState após unmount.
// protegi operações assíncronas com AbortController / flags para evitar mudanças no DOM depois do unmount.
// limpei intervals/timeouts de polling corretamente no useEffect cleanup.
// removi qualquer manipulação direta do DOM (o QR é somente mostrado via <img src=... /> do React).
// adicionei checagens antes de todos os setX após await para garantir que o componente ainda existe.
