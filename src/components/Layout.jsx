import { useState } from 'react'
import Icon from './Icon.jsx'

const primaryNavItems = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'library', label: 'Explore', icon: 'list' },
  { id: 'community', label: 'Chat', icon: 'forum' },
  { id: 'learning', label: 'Learning', icon: 'school' },
]

const secondaryNavItems = [
  { id: 'videos', label: 'Videos', icon: 'play' },
  { id: 'notes', label: 'Notes', icon: 'article' },
  { id: 'labs', label: 'Labs', icon: 'science' },
  { id: 'downloads', label: 'Downloads', icon: 'download' },
  { id: 'about', label: 'About', icon: 'info' },
]

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
  const [overflowOpen, setOverflowOpen] = useState(false)
  const currentNav = activeNav || page
  const activeId = typeByPage[currentNav] ? 'library' : currentNav
  const initials = String(user?.name || 'Learner')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const overflowItems = user?.isAdmin
    ? [
        ...secondaryNavItems,
        { id: 'admin', label: 'Admin workspace', icon: 'bolt' },
        { id: 'stats', label: 'Learner statistics', icon: 'group' },
      ]
    : secondaryNavItems

  const goTo = (id) => {
    setMenuOpen(false)
    setOverflowOpen(false)
    navigate(id)
  }

  const onSearch = (event) => {
    setQuery(event.target.value)
    if (event.target.value.trim() && !['library', 'videos', 'notes', 'labs'].includes(page)) {
      navigate('library')
    }
  }

  return (
    <div className="app-shell">
      <header className="top-app-bar">
        <button className="brand" onClick={() => goTo('home')} aria-label="Aristotool home">
          <span className="brand-mark">A</span>
          <span className="brand-name">
            Aristo<span>tool</span>
          </span>
        </button>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryNavItems.map((item) => (
            <button
              key={item.id}
              className={`${activeId === item.id ? 'active' : ''} ${
                item.id === 'community' ? 'chat-nav' : ''
              }`}
              onClick={() => goTo(item.id)}
              aria-current={activeId === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} size={19} />
              <span className={item.id === 'community' ? 'chat-label' : undefined}>{item.label}</span>
            </button>
          ))}
        </nav>

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

        <div
          className="overflow-wrap"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOverflowOpen(false)
          }}
        >
          <button
            className="overflow-button"
            onClick={() => {
              setOverflowOpen((open) => !open)
              setMenuOpen(false)
            }}
            aria-label="More pages"
            aria-expanded={overflowOpen}
            aria-controls="page-menu"
          >
            <Icon name="menu" size={20} />
            <span>More</span>
          </button>
          {overflowOpen && (
            <div className="overflow-menu" id="page-menu" role="menu">
              {overflowItems.map((item) => (
                <button
                  key={item.id}
                  className={`menu-item ${activeId === item.id ? 'active' : ''}`}
                  role="menuitem"
                  onClick={() => goTo(item.id)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setOverflowOpen(false)
                  toggleTheme()
                }}
              >
                <Icon name={theme === 'light' ? 'darkMode' : 'lightMode'} />
                <span>{theme === 'light' ? 'Dark theme' : 'Light theme'}</span>
              </button>
            </div>
          )}
        </div>

        <button className="icon-button desktop-action" onClick={toggleTheme} aria-label="Toggle colour theme">
          <Icon name={theme === 'light' ? 'darkMode' : 'lightMode'} size={21} />
        </button>
        <button
          className="icon-button desktop-action"
          onClick={() => goTo('learning')}
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
            onClick={() => {
              setMenuOpen((open) => !open)
              setOverflowOpen(false)
            }}
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
              <button
                className="menu-item"
                role="menuitem"
                onClick={() => goTo('learning')}
              >
                <Icon name="school" /> My learning
              </button>
              <button
                className="menu-item"
                role="menuitem"
                onClick={() => goTo('downloads')}
              >
                <Icon name="download" /> Downloads &amp; offline
              </button>
              <button
                className="menu-item"
                role="menuitem"
                onClick={() => goTo('community')}
              >
                <Icon name="forum" /> Chat
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
        {primaryNavItems.map((item) => (
          <button
            key={item.id}
            className={`${activeId === item.id ? 'active' : ''} ${
              item.id === 'community' ? 'chat-nav' : ''
            }`}
            onClick={() => goTo(item.id)}
            aria-current={activeId === item.id ? 'page' : undefined}
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
