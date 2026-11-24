import Icon from '../components/Icon.jsx'

const values = [
  {
    icon: 'shield',
    title: 'Ethics first',
    color: '#0f766e',
    text: 'Every lesson is framed around authorisation, scope and responsibility. Skill without judgement is not the goal.',
  },
  {
    icon: 'science',
    title: 'Learn by doing',
    color: '#9c6b3f',
    text: 'Concepts stick when you practice them. Our labs are scoped, guided and built for deliberate repetition.',
  },
  {
    icon: 'menuBook',
    title: 'Clear by design',
    color: '#18887b',
    text: 'Short lessons, reusable notes and a sensible order — so you spend less time figuring out where to start.',
  },
  {
    icon: 'group',
    title: 'For the community',
    color: '#9a5b12',
    text: 'Built for students, career changers and working defenders who want a dependable place to sharpen their craft.',
  },
]

export default function About({ navigate }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">About Aristotool</p>
          <h1>Security education, made approachable.</h1>
          <p className="lead">
            Aristotool brings video lessons, lecture notes and hands-on labs together in one calm,
            focused workspace for learning ethical hacking properly.
          </p>
        </div>
        <button className="button filled" onClick={() => navigate('library')}>
          Start exploring <Icon name="arrowForward" />
        </button>
      </div>

      <section className="about-grid">
        {values.map((value) => (
          <article className="card value-card" key={value.title}>
            <span className="type-badge" style={{ background: value.color, color: '#fff' }}>
              <Icon name={value.icon} size={23} />
            </span>
            <h3>{value.title}</h3>
            <p>{value.text}</p>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="card" style={{ padding: 28 }}>
          <h2>How it works</h2>
          <ol className="step-list" style={{ marginTop: 18 }}>
            <li>
              <strong>Pick a path or browse the library</strong>
              <p>Choose a guided route or filter by topic, format and difficulty.</p>
            </li>
            <li>
              <strong>Watch, read, then practise</strong>
              <p>Each topic pairs explanation with notes and a scoped lab exercise.</p>
            </li>
            <li>
              <strong>Track what sticks</strong>
              <p>Save resources, mark them complete and watch your progress build over time.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="card" style={{ padding: 28 }}>
          <h2>A note on scope</h2>
          <p className="muted" style={{ lineHeight: 1.7, maxWidth: 760 }}>
            Aristotool teaches defensive and authorised security practice. Only test systems you own
            or have explicit written permission to assess. Treat every lab as a sandbox and every
            real-world engagement as a formal agreement with clear boundaries.
          </p>
        </div>
      </section>
    </div>
  )
}
