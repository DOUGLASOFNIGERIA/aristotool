import { useState } from 'react'
import Icon from './Icon.jsx'

const railItems = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'library', label: 'Explore', icon: 'list' },
  { id: 'videos', label: 'Videos', icon: 'play' },
  { id: 'notes', label: 'Notes', icon: 'article' },
  { id: 'labs', label: 'Labs', icon: 'science' },
  { id: 'learning', label: 'Learning', icon: 'school' },
  { id: 'downloads', label: 'Downloads', icon: 'download' },
  { id: 'community', label: 'Community', icon: 'forum' },
  { id: 'about', label: 'About', icon: 'info' },
]

const bottomItems = railItems.filter((item) =>
  ['home', 'library', 'videos', 'labs', 'learning', 'downloads', 'community'].includes(item.id),
)

const typeByPage = {
  videos: 'video',
  notes: 'note',
  labs: 'lab',
}

export default function Layout({
  page,
  activeNav,
  navigate,
  query,
  setQuery,
  theme,
  toggleTheme,
  bookmarkCount,
  user,
  onLogout,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const currentNav = activeNav || page
  const visibleRailItems = user?.isAdmin
    ? [
        ...railItems,
        { id: 'admin', label: 'Admin', icon: 'bolt' },
        { id: 'stats', label: 'Stats', icon: 'group' },
      ]
    : railItems
  const initials = String(user?.name || 'Learner')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const onSearch = (event) => {
    setQuery(event.target.value)
    if (event.target.value.trim() && !['library', 'videos', 'notes', 'labs'].includes(page)) {
      navigate('library')
    }
  }

  return (
    <div className="app-shell">
      <nav className="nav-rail" aria-label="Primary navigation">
        <div className="rail-logo" aria-label="Aristotool">
          <Icon name="shield" size={24} />
        </div>
        {visibleRailItems.map((item) => (
          <button
            key={item.id}
            className={`rail-item ${currentNav === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.id)}
            aria-current={currentNav === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} size={23} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="rail-spacer" />
        <button className="rail-item" onClick={toggleTheme} aria-label="Toggle colour theme">
          <Icon name={theme === 'light' ? 'darkMode' : 'lightMode'} size={22} />
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </nav>

      <header className="top-app-bar">
        <button className="brand" onClick={() => navigate('home')} aria-label="Aristotool home">
          <span className="brand-mark">A</span>
          <span className="brand-name">
            Aristo<span>tool</span>
          </span>
        </button>
        <label className="search-box">
          <Icon name="search" size={20} />
          <input
            value={query}
            onChange={onSearch}
            onFocus={() => {
              if (query.trim() && !['library', 'videos', 'notes', 'labs'].includes(page)) {
                navigate('library')
              }
            }}
            placeholder="Search videos, notes and labs"
            aria-label="Search resources"
          />
          <span className="search-hint">Search</span>
        </label>
        <div className="bar-spacer" />
        <button className="icon-button" onClick={toggleTheme} aria-label="Toggle colour theme">
          <Icon name={theme === 'light' ? 'darkMode' : 'lightMode'} size={21} />
        </button>
        <button
          className="icon-button"
          onClick={() => navigate('learning')}
          aria-label={`My learning, ${bookmarkCount} saved`}
          style={{ position: 'relative' }}
        >
          <Icon name="bookmarkBorder" size={21} />
          {bookmarkCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 5,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--primary)',
              }}
            />
          )}
        </button>
        <div
          className="profile-wrap"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
          }}
        >
          <button
            className="avatar-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`Profile menu for ${user?.name || 'learner'}`}
            aria-expanded={menuOpen}
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="profile-menu" role="menu">
              <div className="menu-head">
                <span className="avatar-button">{initials}</span>
                <div>
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>
              </div>
              {user?.isAdmin && (
                <button
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('admin')
                  }}
                >
                  <Icon name="bolt" /> Admin workspace
                </button>
              )}
              {user?.isAdmin && (
                <button
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('stats')
                  }}
                >
                  <Icon name="group" /> Learner statistics
                </button>
              )}
              <button
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('learning')
                }}
              >
                <Icon name="school" /> My learning
              </button>
              <button
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('downloads')
                }}
              >
                <Icon name="download" /> Downloads &amp; offline
              </button>
              <button
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('community')
                }}
              >
                <Icon name="forum" /> Community chat
              </button>
              <button
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  toggleTheme()
                }}
              >
                <Icon name={theme === 'light' ? 'darkMode' : 'lightMode'} />{' '}
                {theme === 'light' ? 'Dark theme' : 'Light theme'}
              </button>
              <button
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onLogout()
                }}
              >
                <Icon name="arrowForward" /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main-area">{children}</main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className={currentNav === item.id ? 'active' : ''}
            onClick={() => navigate(item.id)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export { typeByPage }
