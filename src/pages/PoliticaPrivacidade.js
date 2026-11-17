// src/pages/PoliticaPrivacidade.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaRobot } from 'react-icons/fa';

export default function PoliticaPrivacidade() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link to="/" className="legal-logo">
            <div className="legal-logo-icon">
              <FaRobot size={22} color="#fff" />
            </div>
            <span className="legal-logo-text">EchoBot</span>
          </Link>
        </div>
      </header>

      <main className="legal-container">
        <div className="legal-content">
          <h1 className="legal-title">Política de Privacidade</h1>
          <p className="legal-updated">Última atualização: Novembro de 2026</p>

          <section className="legal-section">
            <h2>1. Introdução</h2>
            <p>
              A sua privacidade é importante para nós. Esta Política de Privacidade descreve como o
              EchoBot ("nós", "nosso" ou "Serviço") coleta, utiliza, armazena e protege as informações
              dos usuários. Ao utilizar o EchoBot, você concorda com as práticas descritas neste
              documento.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Dados Coletados</h2>
            <p>
              Para o funcionamento do Serviço, coletamos os seguintes dados através da{' '}
              <a
                href="https://developers.facebook.com/docs/instagram-api/"
                target="_blank"
                rel="noopener noreferrer"
                className="link-inline"
              >
                Instagram Graph API
              </a>{' '}
              (fornecida pela Meta Platforms, Inc.):
            </p>
            <ul className="legal-list">
              <li>
                <strong>ID da conta do Instagram:</strong> Identificador numérico único da sua conta
                profissional ou de criador de conteúdo;
              </li>
              <li>
                <strong>Nome de usuário do Instagram:</strong> Seu @username público do Instagram;
              </li>
              <li>
                <strong>Comentários em publicações:</strong> Conteúdo dos comentários recebidos nas
                suas publicações, utilizados para detecção de palavras-chave e acionamento de
                campanhas;
              </li>
              <li>
                <strong>Tokens de acesso (Access Tokens):</strong> Tokens OAuth fornecidos pela Meta
                que permitem ao EchoBot interagir com a API do Instagram em seu nome. Estes tokens são
                necessários para envio de mensagens diretas e leitura de comentários;
              </li>
              <li>
                <strong>Dados de autenticação Google:</strong> Ao fazer login com Google, coletamos seu
                nome, e-mail e foto de perfil para fins de autenticação e identificação na plataforma.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Como Utilizamos os Dados</h2>
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="legal-list">
              <li>Autenticar e identificar o usuário na plataforma;</li>
              <li>Conectar a conta do Instagram do usuário ao Serviço;</li>
              <li>
                Monitorar comentários em publicações para detecção de palavras-chave configuradas
                pelo usuário;
              </li>
              <li>Enviar mensagens diretas automáticas conforme as campanhas criadas pelo usuário;</li>
              <li>Exibir métricas e estatísticas de desempenho das campanhas;</li>
              <li>Manter e melhorar a qualidade do Serviço.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Armazenamento e Segurança</h2>
            <p>
              Todos os dados dos usuários são armazenados de forma segura no{' '}
              <a
                href="https://firebase.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="link-inline"
              >
                Google Firebase
              </a>
              , uma infraestrutura de nuvem fornecida pelo Google Cloud Platform. As medidas de
              segurança incluem:
            </p>
            <ul className="legal-list">
              <li>
                <strong>Criptografia em trânsito:</strong> Todas as comunicações entre o seu navegador
                e nossos servidores são protegidas por HTTPS/TLS;
              </li>
              <li>
                <strong>Criptografia em repouso:</strong> Os dados armazenados no Firebase Firestore
                são automaticamente criptografados em repouso;
              </li>
              <li>
                <strong>Regras de segurança:</strong> O acesso aos dados no Firestore é controlado por
                regras de segurança que garantem que cada usuário acesse apenas seus próprios dados;
              </li>
              <li>
                <strong>Tokens protegidos:</strong> Os tokens de acesso do Instagram são armazenados
                de forma segura e nunca são expostos ao lado do cliente da aplicação.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Compartilhamento de Dados com Terceiros</h2>
            <p>
              O EchoBot <strong>NÃO compartilha, vende, aluga ou distribui</strong> seus dados
              pessoais ou dados da sua conta do Instagram com terceiros. Os dados são utilizados
              exclusivamente para o funcionamento do Serviço conforme descrito nesta política.
            </p>
            <p>
              As únicas exceções aplicam-se quando:
            </p>
            <ul className="legal-list">
              <li>
                Exigido por lei, ordem judicial ou processo legal aplicável;
              </li>
              <li>
                Necessário para proteger os direitos, a segurança ou a propriedade do EchoBot ou de
                seus usuários;
              </li>
              <li>
                Dados são processados pela Meta através da Instagram Graph API como parte do
                funcionamento normal da integração (conforme os termos da Meta).
              </li>
            </ul>
          </section>

          <section className="legal-section legal-section-highlight">
            <h2>6. Instruções para Exclusão de Dados do Usuário</h2>
            <p>
              Você tem o direito de solicitar a exclusão completa de todos os seus dados armazenados no
              EchoBot a qualquer momento. Para isso, siga os passos abaixo:
            </p>

            <div className="legal-steps">
              <div className="legal-step">
                <div className="legal-step-number">1</div>
                <div className="legal-step-content">
                  <strong>Revogar acesso do EchoBot no Instagram</strong>
                  <p>
                    Acesse as configurações do Instagram: vá em{' '}
                    <strong>Configurações → Segurança → Aplicativos e sites</strong> (ou{' '}
                    <strong>Settings → Security → Apps and Websites</strong>). Localize o EchoBot na
                    lista de aplicativos ativos e clique em <strong>"Remover"</strong>. Isso revogará
                    imediatamente o acesso do EchoBot à sua conta do Instagram.
                  </p>
                </div>
              </div>

              <div className="legal-step">
                <div className="legal-step-number">2</div>
                <div className="legal-step-content">
                  <strong>Desconectar o Instagram dentro do EchoBot</strong>
                  <p>
                    Caso ainda tenha acesso ao EchoBot, acesse o painel (Dashboard) e utilize a opção
                    de desconectar sua conta do Instagram. Isso removerá seus tokens de acesso e dados
                    de integração de nossos servidores.
                  </p>
                </div>
              </div>

              <div className="legal-step">
                <div className="legal-step-number">3</div>
                <div className="legal-step-content">
                  <strong>Solicitar exclusão completa dos dados</strong>
                  <p>
                    Envie um e-mail para nosso canal de suporte com o assunto{' '}
                    <strong>"Solicitação de Exclusão de Dados"</strong> informando o e-mail da sua
                    conta Google utilizada no EchoBot. Processaremos a exclusão completa de todos os
                    seus dados (incluindo campanhas, métricas, tokens e informações de perfil) em até{' '}
                    <strong>30 dias úteis</strong>.
                  </p>
                </div>
              </div>
            </div>

            <p className="legal-note">
              Após a exclusão, todos os seus dados serão permanentemente removidos de nossos
              servidores e não poderão ser recuperados. As campanhas ativas serão desativadas
              automaticamente.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Cookies e Tecnologias de Rastreamento</h2>
            <p>
              O EchoBot utiliza cookies essenciais e armazenamento local do navegador exclusivamente
              para manter sua sessão de autenticação ativa. Não utilizamos cookies de rastreamento,
              cookies de publicidade ou ferramentas de analytics de terceiros.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Retenção de Dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa no EchoBot. Ao solicitar a
              exclusão da sua conta ou revogar o acesso, seus dados serão removidos conforme descrito
              na Seção 6.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Direitos do Usuário</h2>
            <p>Conforme a legislação aplicável (incluindo a LGPD — Lei Geral de Proteção de Dados), você tem direito a:</p>
            <ul className="legal-list">
              <li>Acessar os dados pessoais que possuímos sobre você;</li>
              <li>Solicitar a correção de dados incompletos ou incorretos;</li>
              <li>Solicitar a exclusão dos seus dados pessoais;</li>
              <li>Revogar o consentimento para o tratamento dos seus dados;</li>
              <li>Solicitar a portabilidade dos seus dados.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>10. Alterações nesta Política</h2>
            <p>
              Reservamo-nos o direito de atualizar esta Política de Privacidade a qualquer momento. As
              alterações entrarão em vigor imediatamente após a publicação nesta página. Recomendamos
              que você revise esta política periodicamente.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Contato</h2>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre esta Política de Privacidade,
              entre em contato conosco através dos canais de suporte disponíveis na plataforma do
              EchoBot.
            </p>
          </section>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <p>&copy; {new Date().getFullYear()} EchoBot. Todos os direitos reservados.</p>
          <div className="legal-footer-links">
            <Link to="/termos">Termos de Uso</Link>
            <Link to="/privacidade">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
