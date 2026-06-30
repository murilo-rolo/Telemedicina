import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ThemeProvider from './ThemeProvider'
import ThemeToggle from './components/ThemeToggle'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Triagem from './pages/Triagem'
import Consulta from './pages/Consulta'
import TeleconferenciaAssistente from './pages/TeleconferenciaAssistente'
import Acompanhamento from './pages/Acompanhamento'
import Mensagens from './pages/Mensagens'
import MensagensAssistente from './pages/MensagensAssistente'
import PlanoAcao from './pages/PlanoAcao'
import PlanoAcaoAssistente from './pages/PlanoAcaoAssistente'
import CofreDigital from './pages/CofreDigital'
import CofreDigitalAssistente from './pages/CofreDigitalAssistente'
import DashboardMedico from './pages/DashboardMedico'
import ConsultaMedico from './pages/ConsultaMedico'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/triagem" element={<Triagem />} />
          <Route path="/consulta" element={<Consulta />} />
          <Route path="/teleconferencia-assistente" element={<TeleconferenciaAssistente />} />
          <Route path="/acompanhamento" element={<Acompanhamento />} />
          <Route path="/mensagens" element={<Mensagens />} />
          <Route path="/mensagens-assistente" element={<MensagensAssistente />} />
          <Route path="/plano-acao" element={<PlanoAcao />} />
          <Route path="/plano-acao-assistente" element={<PlanoAcaoAssistente />} />
          <Route path="/cofre-digital" element={<CofreDigital />} />
          <Route path="/cofre-digital-assistente" element={<CofreDigitalAssistente />} />
          <Route path="/dashboard-medico" element={<DashboardMedico />} />
          <Route path="/consulta-medica" element={<ConsultaMedico />} />
        </Routes>
        <ThemeToggle />
      </BrowserRouter>
    </ThemeProvider>
  )
}