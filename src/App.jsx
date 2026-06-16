import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Triagem from './pages/Triagem'
import Consulta from './pages/Consulta'
import Acompanhamento from './pages/Acompanhamento'
import DashboardMedico from './pages/DashboardMedico'
import ConsultaMedico from './pages/ConsultaMedico'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/triagem" element={<Triagem />} />
        <Route path="/consulta" element={<Consulta />} />
        <Route path="/acompanhamento" element={<Acompanhamento />} />
        <Route path="/dashboard-medico" element={<DashboardMedico />} />
        <Route path="/consulta-medica" element={<ConsultaMedico />} />
      </Routes>
    </BrowserRouter>
  )
}