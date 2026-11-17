// src/pages/TermosDeUso.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaRobot } from 'react-icons/fa';

export default function TermosDeUso() {
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
          <h1 className="legal-title">Termos de Uso</h1>
          <p className="legal-updated">Última atualização: Novembro de 2026</p>

          <section className="legal-section">
            <h2>1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar o EchoBot ("Serviço"), você concorda integralmente com estes
              Termos de Uso. Caso não concorde com qualquer disposição, não utilize o Serviço. O uso
              continuado após alterações nestes termos constitui aceitação das modificações.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Descrição do Serviço</h2>
            <p>
              O EchoBot é uma plataforma de automação de mensagens diretas (DMs) no Instagram, que
              permite aos usuários criar campanhas de resposta automática com base em palavras-chave
              detectadas em comentários de publicações. O Serviço utiliza a API oficial do Instagram
              (Instagram Graph API) fornecida pela Meta Platforms, Inc.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Elegibilidade</h2>
            <p>
              Para utilizar o EchoBot, você deve:
            </p>
            <ul className="legal-list">
              <li>Ter pelo menos 18 anos de idade ou a maioridade legal em sua jurisdição;</li>
              <li>Possuir uma conta válida no Google para autenticação;</li>
              <li>Possuir uma conta profissional ou de criador de conteúdo no Instagram;</li>
              <li>Ter autoridade para vincular sua conta do Instagram ao Serviço.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Regras de Uso — Conformidade com Políticas da Meta</h2>
            <p>
              Ao utilizar o EchoBot, você se compromete a respeitar integralmente as{' '}
              <a
                href="https://developers.facebook.com/terms/"
                target="_blank"
                rel="noopener noreferrer"
                className="link-inline"
              >
                Políticas da Plataforma Meta
              </a>{' '}
              e os{' '}
              <a
                href="https://help.instagram.com/581066165581870"
                target="_blank"
                rel="noopener noreferrer"
                className="link-inline"
              >
                Termos de Uso do Instagram
              </a>.
              Em particular, você concorda em:
            </p>
            <ul className="legal-list">
              <li>
                <strong>Não enviar spam:</strong> Não utilizar o Serviço para enviar mensagens não
                solicitadas, repetitivas ou em massa que violem as diretrizes da Meta sobre spam e
                comportamento inautêntico;
              </li>
              <li>
                <strong>Não abusar da API:</strong> Não exceder os limites de taxa (rate limits)
                estabelecidos pela Instagram Graph API, nem tentar contornar restrições da plataforma;
              </li>
              <li>
                <strong>Conteúdo adequado:</strong> Não utilizar o Serviço para distribuir conteúdo
                ilegal, difamatório, discriminatório, sexualmente explícito, violento ou que viole
                direitos de terceiros;
              </li>
              <li>
                <strong>Respeitar os usuários:</strong> Garantir que as mensagens automáticas enviadas
                sejam relevantes, transparentes e respeitem a privacidade dos destinatários;
              </li>
              <li>
                <strong>Não utilizar para fraudes:</strong> Não utilizar o Serviço para engenharia
                social, phishing, golpes financeiros ou qualquer atividade fraudulenta.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Limitação de Responsabilidade — Bloqueios e Restrições</h2>
            <p>
              O EchoBot utiliza exclusivamente as APIs oficiais da Meta para realizar suas operações.
              Contudo, o usuário reconhece e aceita que:
            </p>
            <ul className="legal-list">
              <li>
                <strong>Bloqueios pela Meta:</strong> A Meta pode, a seu exclusivo critério, bloquear,
                restringir ou suspender contas do Instagram que apresentem comportamento considerado
                como spam ou abusivo, independentemente de o usuário estar utilizando o EchoBot ou não.
                O EchoBot <strong>não se responsabiliza</strong> por quaisquer bloqueios, shadowbans,
                suspensões ou perda de funcionalidades impostos pela Meta à conta do usuário;
              </li>
              <li>
                <strong>Riscos de automação:</strong> Toda automação de mensagens no Instagram carrega
                riscos inerentes. O volume, a frequência e o conteúdo das mensagens são de
                responsabilidade exclusiva do usuário;
              </li>
              <li>
                <strong>Sem garantias:</strong> O Serviço é fornecido "no estado em que se encontra"
                (as is) e "conforme disponível" (as available), sem garantias de qualquer espécie,
                expressas ou implícitas, incluindo garantias de adequação a um fim específico ou de não
                infração;
              </li>
              <li>
                <strong>Danos indiretos:</strong> Em nenhuma hipótese o EchoBot, seus operadores,
                diretores, funcionários ou afiliados serão responsáveis por danos indiretos,
                incidentais, especiais, consequenciais ou punitivos, incluindo lucros cessantes, perda
                de dados, perda de receita ou interrupção de negócios.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Condições do Serviço</h2>
            <ul className="legal-list">
              <li>
                <strong>Disponibilidade:</strong> O EchoBot se esforça para manter o Serviço
                disponível de forma ininterrupta, mas não garante disponibilidade 100%. Manutenções
                programadas, atualizações e eventos fora de nosso controle podem causar
                indisponibilidade temporária;
              </li>
              <li>
                <strong>Alterações no Serviço:</strong> Reservamo-nos o direito de modificar,
                suspender ou descontinuar qualquer funcionalidade do Serviço a qualquer momento, com ou
                sem aviso prévio;
              </li>
              <li>
                <strong>Conta do usuário:</strong> Você é responsável pela segurança de sua conta
                Google e das credenciais do Instagram vinculadas ao EchoBot. Qualquer atividade
                realizada através de sua conta é de sua responsabilidade;
              </li>
              <li>
                <strong>Encerramento:</strong> Podemos suspender ou encerrar o acesso de qualquer
                usuário que viole estes Termos ou as políticas da Meta, sem aviso prévio e sem
                obrigação de reembolso.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, design, código-fonte, marcas, logotipos e materiais do EchoBot são
              protegidos por direitos autorais e leis de propriedade intelectual. É vedada a
              reprodução, distribuição ou criação de obras derivadas sem autorização prévia por escrito.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Indenização</h2>
            <p>
              Você concorda em indenizar e isentar o EchoBot, seus operadores e afiliados de
              quaisquer reclamações, perdas, danos, custos e despesas (incluindo honorários
              advocatícios) decorrentes do uso indevido do Serviço, da violação destes Termos ou da
              violação de direitos de terceiros.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de atualizar estes Termos de Uso a qualquer momento. As
              alterações entrarão em vigor na data de sua publicação. Recomendamos que você revise esta
              página periodicamente. O uso continuado do Serviço após qualquer alteração constitui
              aceitação dos novos termos.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Legislação Aplicável</h2>
            <p>
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer
              litígio decorrente destes Termos será resolvido no foro da comarca do domicílio do
              usuário, conforme o Código de Defesa do Consumidor.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Contato</h2>
            <p>
              Em caso de dúvidas sobre estes Termos de Uso, entre em contato conosco através do e-mail
              disponível na plataforma ou através dos canais de suporte do EchoBot.
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
