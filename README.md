# EloSocial — Telemedicina

Plataforma de telemedicina e assistência social que conecta cidadãos em situação de vulnerabilidade a assistentes sociais e médicos por meio de ferramentas digitais.

## Funcionalidades

- **Triagem social multi-etapas** — Formulário de 5 etapas (Contato, Família, Motivo, Urgência, Relato) com cálculo de prioridade
- **Videoconferência integrada** — Chamadas de vídeo embedadas via Daily.co com criação automática de salas
- **Mensagens em tempo real** — Chat por caso com atualização instantânea via Supabase Realtime
- **Plano de Ação** — Gerenciamento de tarefas com status (pendente → em_andamento → concluido)
- **Cofre Digital** — Upload, visualização e exclusão de documentos por caso (Supabase Storage)
- **Dashboard profissional** — Fila de casos ordenada por prioridade e status, com filtros KPIs
- **Prontuário Social** — Visão detalhada do caso com acesso a todas as ferramentas de atendimento
- **Autenticação** — Login e cadastro com Supabase Auth, diferenciação de perfis (cidadão x profissional)

## Fluxo do caso

```
Cidadão se cadastra
       ↓
Preenche triagem → caso criado com status "pendente"
       ↓
Profissional visualiza na fila do dashboard
       ↓
Inicia atendimento → status "em_atendimento"
       ↓
Videoconferência, mensagens, plano de ação, documentos
       ↓
Acompanhamento → status "em_acompanhamento"
       ↓
Conclusão → status "concluido"
```

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Supabase (Auth, PostgreSQL, Realtime, Storage, Edge Functions) |
| Videochamada | Daily.co (@daily-co/daily-js) |
| Ícones | Lucide React |
| Deploy | Vercel (SPA) |
| Linting | ESLint 9 |

## Estrutura do projeto

```
src/
├── main.jsx                         # Entry point React
├── App.jsx                          # Rotas (BrowserRouter)
├── supabaseClient.js                # Cliente Supabase
├── index.css                        # Import Tailwind CSS
├── pages/
│   ├── Login.jsx                    # / — Login
│   ├── Cadastro.jsx                 # /cadastro — Cadastro
│   ├── Triagem.jsx                  # /triagem — Formulário multi-etapas
│   ├── Acompanhamento.jsx           # /acompanhamento — Dashboard do cidadão
│   ├── Consulta.jsx                 # /consulta — Sala de espera do cidadão
│   ├── Mensagens.jsx                # /mensagens — Chat (cidadão)
│   ├── PlanoAcao.jsx                # /plano-acao — Plano de ação (cidadão)
│   ├── CofreDigital.jsx             # /cofre-digital — Documentos (cidadão)
│   ├── DashboardMedico.jsx          # /dashboard-medico — Fila de casos
│   ├── ConsultaMedico.jsx           # /consulta-medica — Prontuário Social
│   ├── TeleconferenciaAssistente.jsx # /teleconferencia-assistente — Videochamada
│   ├── MensagensAssistente.jsx      # /mensagens-assistente — Chat (profissional)
│   ├── PlanoAcaoAssistente.jsx      # /plano-acao-assistente — Plano de ação (prof.)
│   └── CofreDigitalAssistente.jsx   # /cofre-digital-assistente — Documentos (prof.)
├── components/
│   ├── VideoCall.jsx                # Componente Daily.co
│   ├── MensagensCaso.jsx            # Chat em tempo real por caso
│   ├── DocumentosCaso.jsx           # Upload/lista/documentos por caso
│   └── PlanoAcaoCaso.jsx            # Tarefas do plano de ação
└── utils/
    ├── acolhimento.js               # Normalização dos dados de triagem
    └── daily.js                     # Helper para criar salas Daily.co
supabase/
└── functions/
    └── criar-sala-daily/
        └── index.ts                 # Edge Function (Deno) — cria salas Daily.co
```

## Banco de dados (Supabase)

Principais tabelas utilizadas:

- `perfis` — Perfis de usuário (tipo: cidadao, assistente, medico)
- `triagens` — Casos de atendimento (status, prioridade, dados do acolhimento)
- `mensagens_caso` — Mensagens do chat por caso
- `plano_acao_itens` — Tarefas do plano de ação
- `documentos_caso` — Metadados dos documentos no Storage

## Execução local (sem Vercel)

O projeto é um **frontend React puro** com Vite — não precisa de Vercel nem de qualquer servidor Node para rodar. O Vercel é usado apenas para deploy.

### Pré-requisitos

- **Node.js 18+** e **npm** instalados
- **Projeto Supabase** ativo ([supabase.com](https://supabase.com)) com as tabelas configuradas
- **Daily.co** — a chave da API vai como secret na Edge Function do Supabase, não no frontend

### Passo a passo

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd Telemedicina

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env

# 4. Edite .env com suas credenciais do Supabase (APENAS as duas VITE_*)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 5. Inicie o servidor de desenvolvimento
npm run dev
# → Vite sobe em http://localhost:5173

# 6. (opcional) Build de produção local
npm run build
npm run preview
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sim | Chave anônima pública do Supabase |
| `DAILY_API_KEY` | Não (frontend) | Usada apenas na Edge Function do Supabase (server-side) |

> ⚠️ A `DAILY_API_KEY` **não** precisa ser definida no `.env` do frontend. Ela vai como variável de ambiente na Edge Function `criar-sala-daily` dentro do próprio Supabase.

### Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento Vite |
| `npm run build` | Gera build de produção |
| `npm run preview` | Preview do build local |
| `npm run lint` | Executa ESLint |

## Deploy (Vercel)

O projeto está configurado para deploy na Vercel como SPA (`vercel.json` com rewrites para todas as rotas servirem `index.html`).  
Não é necessário para execução local.

## Design

Tema escuro com acentos verde-floresta (`#4ade80`), cards com bordas arredondadas, scrollbar customizada.
