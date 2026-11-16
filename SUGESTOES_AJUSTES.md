# Sugestões de ajustes — EchoBot

Revisão estática do código-fonte, configuração Firebase, interface, estilos, documentação e artefatos PWA. Este documento acompanha as recomendações e o estado atual das correções.

## Status das correções

As correções abaixo foram aplicadas no código e ainda precisam de deploy para entrar em vigor:

- Segredos removidos do código/arquivo local e lidos do Firebase Secret Manager; assinatura de webhook validada e eventos deduplicados.
- Fluxo OAuth alinhado à URL de Login Unificado fornecida, com validação de `state`; troca de token e consulta da conta seguem o fluxo oficial de Login Unificado.
- Cada conta conectada é inscrita automaticamente no webhook `comments`; o endpoint verifica a assinatura, deduplica eventos e responde com erro quando o processamento falha.
- Tokens legados migram para `privateUsers`; a conexão antiga exige reconexão pelo Login Unificado. As regras bloqueiam acesso do cliente à coleção privada e negam a leitura de perfis que ainda contenham campos de token.
- Campo de resposta pública, contagem de DMs, `{nome}`, correspondência exata, tratamento de erros, recursos PWA e foco/semântica do modal foram corrigidos.
- README, testes unitários, `.gitignore` e build foram atualizados.

**Aguardando ação do proprietário:** a credencial da Meta ainda não foi rotacionada. Rotacione-a antes de configurar `META_APP_SECRET` no Secret Manager e gere um novo `WEBHOOK_VERIFY_TOKEN`. Termos e Política de Privacidade ainda não existem; o app agora avisa isso e precisa receber URLs públicas distintas antes de ser disponibilizado. A expiração TTL de `webhookEvents.expiresAt` e a configuração do App Check também dependem do console Firebase/Meta. Para atender clientes fora dos papéis de teste, publique o app e solicite Advanced Access/App Review no Meta.

**Deploy seguro:** configure os dois segredos; publique Functions, depois Hosting e por último `firestore.rules`, conforme as instruções do README. A migração legada só ocorre quando o usuário entra na nova versão.

## Achados da revisão inicial

1. **Rotacionar e proteger credenciais da Meta.** O segredo da aplicação está definido diretamente em `functions/index.js`; também há um token de verificação fixo como fallback e um arquivo `functions/.env` com valor configurado. Trate os valores atuais como expostos: rotacione-os no painel da Meta, remova valores fixos do código e use Firebase Secret Manager/parametrização segura. Confirme também que `.env` não é versionado nem distribuído. Não registre valores de credenciais em logs ou documentação.
2. **Validar a autenticidade dos webhooks.** `webhookHandler` aceita eventos sem validar a assinatura `X-Hub-Signature-256`. Verifique a assinatura HMAC do corpo bruto com o segredo da aplicação, compare de forma segura e rejeite requisições inválidas antes de qualquer ação. Hoje, um evento forjado pode tentar disparar mensagens usando tokens armazenados.
3. **Retirar tokens de acesso do documento acessível pelo cliente.** `pageAccessToken` é salvo em `users/{uid}`, e [firestore.rules](firestore.rules) permite ao próprio usuário ler e gravar o documento inteiro. Mova credenciais para armazenamento acessível somente pelo backend e restrinja as regras do perfil a campos não sensíveis, com validação explícita dos campos graváveis.

## Prioridade alta (revisão inicial)

4. **Unificar o campo de resposta pública.** A interface grava e exibe `commentReply` ([CampaignModal.js](src/components/CampaignModal.js), [CampaignCard.js](src/components/CampaignCard.js)), mas o webhook procura `publicReply` ([functions/index.js](functions/index.js)). Como resultado, a resposta pública configurada não é enviada. Padronize o nome do campo em leitura, gravação e processamento.
5. **Corrigir contagem e confiabilidade do envio.** O contador `dmsSent` é incrementado mesmo quando o envio de DM falha (os erros são capturados e ignorados antes da atualização). Conte apenas envios confirmados e diferencie falha, tentativa e sucesso; evite contabilizar um match sem DM enviado como um DM concluído.
6. **Adicionar idempotência ao webhook.** Eventos repetidos podem produzir mensagens duplicadas, pois não há registro/deduplicação por ID do comentário ou evento. Persista uma chave idempotente antes de processar e use uma fila ou mecanismo durável; responda sucesso ao provedor depois que o evento estiver aceito para processamento, sem perder erros após a resposta HTTP.
7. **Alinhar OAuth e proteger o fluxo.** O ID do aplicativo e a URL de callback descritos em [README.md](README.md) divergem dos valores usados em [Dashboard.js](src/pages/Dashboard.js) e [functions/index.js](functions/index.js). Centralize e confira os valores com o painel da Meta e os domínios autorizados. Inclua e valide `state` no fluxo OAuth contra CSRF; em [AuthCallback.js](src/pages/AuthCallback.js), substitua a espera fixa de 500 ms por uma verificação explícita de autenticação antes de chamar a função.
8. **Implementar a personalização anunciada.** O formulário sugere usar `{nome}` na mensagem, mas o backend envia o texto sem substituir o marcador. Implemente a substituição com dados efetivamente fornecidos pela API, ou remova a promessa da interface se esse dado não estiver disponível.
9. **Definir claramente o modo de correspondência exata.** A opção “Exata” usa limites de palavra, portanto aceita texto adicional ao redor da palavra-chave, apesar da descrição dizer que a mensagem deve ser exatamente a palavra. Alinhe o algoritmo e o texto explicativo ao comportamento desejado, incluindo casos de pontuação e acentos.
10. **Validar dados também no backend/Firestore.** As regras atuais permitem ao usuário gravar qualquer campo no perfil e qualquer conteúdo em campanhas. Restrinja campos e tipos permitidos, tamanhos e transições válidas; não confie apenas na validação do formulário, que pode ser contornada por chamadas diretas ao Firestore.

## Prioridade média (revisão inicial)

11. **Tornar erros de inicialização e consulta visíveis.** O listener de autenticação em [AuthContext.js](src/context/AuthContext.js) não trata falhas de leitura/criação do perfil; isso pode deixar o carregamento sem conclusão. Em [CampaignList.js](src/components/CampaignList.js), falhas de `onSnapshot` só aparecem no console e podem parecer uma lista vazia. Exponha estado de erro e permita tentar novamente. `logout` também captura o erro sem propagá-lo, embora a tela tente tratar falha.
12. **Completar os recursos PWA.** [manifest.json](public/manifest.json) e [index.html](public/index.html) referenciam `favicon.ico`, `logo192.png` e `logo512.png`, mas esses arquivos não existem em `public/` nem no `build/`. Inclua os recursos ou remova/ajuste as referências.
13. **Completar acessibilidade do modal e dos controles.** O modal de campanha fecha com Escape, mas não mantém o foco dentro dele, não restaura o foco ao fechar e não associa explicitamente o título ao diálogo. Revise foco visível, nomes acessíveis e feedback de carregamento nos botões e mensagens de erro.
14. **Publicar Termos e Política de Privacidade reais.** Os links na tela de login apontam para fragmentos `#termos` e `#privacidade`, sem conteúdo correspondente. Disponibilize páginas/documentos acessíveis e revise as permissões e o tratamento de dados exigidos pela integração com a Meta.
15. **Revisar a documentação e o deploy.** [README.md](README.md) informa Node.js 20 para Functions, enquanto [firebase.json](firebase.json) e `functions/package.json` indicam Node.js 22. Atualize as instruções de configuração de segredos para o mecanismo recomendado pelo Firebase Functions v2 e mantenha IDs/URLs OAuth alinhados.
16. **Adicionar testes focados.** Não foram encontrados testes do app nas fontes. Priorize testes para validação de assinatura e duplicidade do webhook, correspondência de palavras-chave, contrato dos campos de campanha, fluxo de callback OAuth e regras do Firestore usando o Emulator Suite.

## Observações

- A chave Firebase presente no frontend identifica o projeto e não deve ser tratada como segredo por si só; a proteção depende principalmente das regras, App Check e controles do backend.
- Considere habilitar App Check nas operações Firebase compatíveis e rever limites/monitoramento para reduzir abuso e custos.
- Validação executada: seis testes unitários das Functions, três testes das regras no Firestore Emulator, ESLint das Functions sem avisos e build React concluído.
- Não houve deploy nem chamada autenticada à Meta/Firebase.
