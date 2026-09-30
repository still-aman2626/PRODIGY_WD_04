import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="brand">
          <span className="brand-mark">P</span>
          PulseChat
        </Link>

        <div className="nav-actions">
          <Link to="/login" className="nav-login">
            Sign in
          </Link>

          <Link to="/register" className="nav-cta">
            Get started
          </Link>
        </div>
      </nav>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="pulse-dot" />
              REAL-TIME COMMUNICATION
            </div>

            <h1>
              Conversations
              <br />
              <span>without delay.</span>
            </h1>

            <p>
              PulseChat is a modern real-time messaging platform built for fast,
              secure and effortless conversations.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="primary-button">
                Start chatting
                <span>→</span>
              </Link>

              <Link to="/login" className="secondary-button">
                Sign in
              </Link>
            </div>

            <div className="hero-note">
              <span>●</span>
              Powered by WebSockets
            </div>
          </div>

          <div className="hero-visual">
            <div className="orb orb-one" />
            <div className="orb orb-two" />

            <div className="chat-preview">
              <div className="preview-top">
                <div className="preview-room">
                  <div className="room-icon">#</div>

                  <div>
                    <strong>Realtime</strong>
                    <small>2 members</small>
                  </div>
                </div>

                <span className="online-status">
                  <i />
                  Connected
                </span>
              </div>

              <div className="preview-messages">
                <div className="preview-message other">
                  <span>Hey! Is this live?</span>
                  <small>10:42</small>
                </div>

                <div className="preview-message own">
                  <span>Yep. Instant delivery. ⚡</span>
                  <small>10:42</small>
                </div>

                <div className="preview-message other">
                  <span>That was fast.</span>
                  <small>10:43</small>
                </div>
              </div>

              <div className="preview-input">
                <span>Type a message...</span>
                <button>↑</button>
              </div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="section-heading">
            <span>BUILT FOR CONVERSATIONS</span>
            <h2>Everything happens in real time.</h2>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant messaging</h3>
              <p>
                Messages travel through persistent WebSocket connections for a
                responsive chat experience.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">◉</div>
              <h3>Conversation rooms</h3>
              <p>
                Join shared rooms and keep conversations organized around the
                people and topics that matter.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">⌁</div>
              <h3>Persistent history</h3>
              <p>
                Conversations are stored securely so your messages remain
                available when you return.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-brand">
          <span className="brand-mark">P</span>
          PulseChat
        </div>

        <span>© 2026 PulseChat. Real-time communication.</span>
      </footer>
    </div>
  );
};

export default Landing;
