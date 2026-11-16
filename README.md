# 🤖 EchoBot — Plataforma SaaS de Automação para Instagram

Plataforma SaaS web (PWA) de automação para o Instagram, focada em disparar mensagens automáticas no Direct (DM) e responder publicamente quando seguidores comentam palavras-chave específicas nas publicações dos utilizadores (influenciadores).

---

## 🛠️ Stack Tecnológica

- **Front-end**: React.js 18 (PWA Responsivo), React Router v6, React Hot Toast, React Icons.
- **Back-end**: Firebase Cloud Functions (Node.js 22, v2 HTTPS & Callable).
- **Base de Dados**: Firebase Firestore (NoSQL) com regras de segurança ativas.
- **Autenticação**: Firebase Authentication (Google Sign-In + Meta OAuth 2.0).
- **Hospedagem**: Firebase Hosting (com suporte a Single Page Application).
- **Integração Externa**: Instagram API com Login Unificado (Graph API v27.0, Webhooks, Comments & Private Replies).

---

## 📁 Estrutura do Projeto

```
EchoBot/
├── build/                        # Build de produção do React (pronto para deploy)
├── functions/                    # Firebase Cloud Functions (Node.js 22)
│   ├── index.js                  # Endpoints: webhookVerify, webhookHandler, exchangeToken
│   ├── campaignUtils.js          # Correspondência de palavras-chave e personalização
│   ├── webhookSecurity.js        # Verificação da assinatura dos webhooks
│   └── test/                     # Testes unitários Node.js
│   ├── package.json              # Dependências do backend (firebase-admin, axios, etc.)
│   └── node_modules/
├── public/
│   ├── index.html                # Template HTML PWA
│   └── manifest.json             # Manifesto PWA
├── src/
│   ├── components/
│   │   ├── CampaignCard.js       # Card de campanha (toggle, editar, excluir)
│   │   ├── CampaignList.js       # Lista com onSnapshot em tempo real
│   │   ├── CampaignModal.js      # Modal para criar e editar campanhas
│   │   └── StatsCard.js          # Cartões de métricas (DMs enviados, campanhas ativas)
│   ├── context/
│   │   └── AuthContext.js        # Gerenciamento de estado de autenticação e perfil
│   ├── pages/
│   │   ├── Login.js              # Página de login com Google e apresentação do SaaS
│   │   ├── Dashboard.js          # Painel principal do influenciador
│   │   └── AuthCallback.js       # Callback de troca de token OAuth da Meta
│   ├── styles/
│   │   └── App.css               # Folha de estilos moderna e responsiva
│   ├── App.js                    # Configuração de rotas públicas e privadas
│   ├── firebase.js               # Inicialização dos serviços Firebase
│   └── index.js                  # Ponto de entrada do React
├── firebase.json                 # Configuração do Firebase Hosting, Functions e Firestore
├── .firebaserc                   # Apontamento para o projeto: echobot-2254b
├── firestore.rules               # Regras de segurança rigorosas do Firestore
├── firestore.indexes.json        # Índices compostos para consultas
└── package.json                  # Dependências do Front-end
```

---

## ⚡ Como Rodar Localmente

### 1. Iniciar o Front-end React
```bash
npm start
```
O app abrirá em [http://localhost:3000](http://localhost:3000).

---

## 🚀 Como Fazer Deploy no Firebase

### 1. Fazer Login no Firebase CLI
```bash
npx firebase-tools login
```

### 2. Configurar os segredos das Cloud Functions

Rotacione no painel da Meta o segredo da aplicação que já esteve presente no código/capturas. Depois, configure os dois segredos no Firebase Secret Manager. O CLI solicitará os valores no terminal; não os coloque no código, no chat ou em arquivos versionados:

```bash
npx firebase-tools functions:secrets:set META_APP_SECRET
npx firebase-tools functions:secrets:set WEBHOOK_VERIFY_TOKEN
```

O mesmo `WEBHOOK_VERIFY_TOKEN` deve ser informado no cadastro do webhook da Meta. O arquivo `functions/.env` foi removido; arquivos `.env` e `.secret.local` são ignorados pelo Git.

### 3. Gerar o Build e Publicar

Depois de configurar os segredos, publique nesta ordem para permitir que a nova versão migre credenciais antigas antes de as regras bloquearem a leitura do perfil:

```bash
npx firebase-tools deploy --only functions
npm run build
npx firebase-tools deploy --only hosting
npx firebase-tools deploy --only firestore:rules
```

---

## 🔗 Configuração do Webhook no Portal Meta for Developers

1. Acesse o [Meta for Developers](https://developers.facebook.com/) e entre no aplicativo **`2571540876656566`**.
2. Em **Casos de uso** > **Gerenciar mensagens e conteúdo no Instagram** > **Personalizar**, use **API setup with Unified Login** e a configuração selecionada.
3. Confirme que o callback OAuth registrado é `https://echobot-2254b.web.app/auth/callback`. O app envia `config_id=4750108781977729` e gera/valida `state` por tentativa.
4. Vá em **Webhooks** > Selecione **Instagram**.
5. Em **Callback URL**, insira a URL da Cloud Function do Webhook (unificada para GET e POST):
   ```
   https://us-central1-echobot-2254b.cloudfunctions.net/webhook
   ```
   *(Nota: `webhookVerify` e `webhookHandler` também continuam disponíveis e respondem aos mesmos métodos para compatibilidade).*
6. Em **Verify Token**, informe o valor configurado em `WEBHOOK_VERIFY_TOKEN`.
7. Clique em **Verificar e Salvar**.
8. Em **Campos de Assinatura**, assine o campo:
   - `comments`

Ao conectar uma conta, o backend assina automaticamente essa conta ao campo `comments`. A assinatura global do app e o callback devem estar configurados no painel antes do teste.

---

## 🛡️ Regras de Segurança (Firestore Rules)
O arquivo [`firestore.rules`](file:///c:/Users/maiko/Desktop/projetos/EchoBot/firestore.rules) garante que:
- Cada usuário só pode ler seu próprio perfil; apenas campos de perfil não sensíveis podem ser alterados pelo cliente.
- Cada usuário só pode gerenciar campanhas próprias com campos e limites validados.
- Tokens ficam em `privateUsers/{userId}`, coleção inacessível pelo cliente.
- Todas as outras tentativas de acesso ao banco de dados são rejeitadas.

Ao entrar após o deploy, a callable `migrateInstagramCredentials` move credenciais antigas para armazenamento privado, remove os campos legados do perfil e marca a conexão antiga como desconectada. O usuário deve reconectar pelo Login Unificado para habilitar a conta e a assinatura dos webhooks. Os tokens nunca são devolvidos ao frontend.

## 🧪 Testes

```bash
npm --prefix functions test
npm --prefix functions run lint
npm run test:rules
npm run build
```

`npm run test:rules` inicia o Firestore Emulator; requer Firebase CLI e Java.
Configure também a expiração TTL do Firestore para o campo `expiresAt` da coleção `webhookEvents` (90 dias), para remover registros de deduplicação expirados.
O backend registra a expiração do token conforme a configuração da Meta, mas ainda não renova automaticamente tokens que estejam perto do vencimento.

---

## ⚙️ Variáveis e Credenciais Utilizadas

- **Firebase Project ID**: `echobot-2254b`
- **Meta App ID**: `2571540876656566`
- **Meta Login Configuration ID**: `4750108781977729`
- **OAuth Callback URL**: `https://echobot-2254b.web.app/auth/callback`
- **Permissões configuradas no Meta**:
  - `instagram_manage_messages`
  - `instagram_manage_comments`
  - `instagram_basic`

O Login Unificado usa as permissões e os ativos definidos na configuração do painel Meta; valide essa lista antes de publicar. A aplicação atualmente escolhe a primeira conta do Instagram compartilhada na resposta da configuração.
Para atender clientes fora dos papéis de teste, o app precisa estar no modo Live e obter Advanced Access/App Review para as permissões necessárias.

Referências oficiais:
- [Instagram API com Login Unificado](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login)
- [Troca do código e IDs das contas](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started)
- [Configuração de webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks/setup)

## 📄 Termos e privacidade

Os documentos ainda não foram publicados. Cadastre URLs públicas distintas para Termos de Uso e Política de Privacidade no painel Meta e substitua o aviso da tela de login antes de disponibilizar o app para outras pessoas.
