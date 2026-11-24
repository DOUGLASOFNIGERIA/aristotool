import { useState } from 'react'
import Icon from './Icon.jsx'
import LogoMark from './LogoMark.jsx'

const navItemById = {
  home: { id: 'home', label: 'Home', icon: 'home' },
  library: { id: 'library', label: 'Explore', icon: 'list' },
  learning: { id: 'learning', label: 'Learning', icon: 'school' },
  downloads: { id: 'downloads', label: 'Downloads', icon: 'download' },
  community: { id: 'community', label: 'Chat', icon: 'forum' },
  videos: { id: 'videos', label: 'Videos', icon: 'play' },
  notes: { id: 'notes', label: 'Notes', icon: 'article' },
  labs: { id: 'labs', label: 'Labs', icon: 'science' },
  about: { id: 'about', label: 'About', icon: 'info' },
  admin: { id: 'admin', label: 'Admin workspace', icon: 'bolt' },
  stats: { id: 'stats', label: 'Learner statistics', icon: 'group' },
}

const mobileNavItems = ['home', 'library', 'learning', 'community'].map((id) => navItemById[id])
const desktopNavItems = ['home', 'library', 'learning', 'downloads', 'community'].map((id) => navItemById[id])
const secondaryNavItems = ['videos', 'notes', 'labs', 'about'].map((id) => navItemById[id])
const adminNavItems = ['admin', 'stats'].map((id) => navItemById[id])

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

  const desktopOverflowItems = user?.isAdmin
    ? [...secondaryNavItems, ...adminNavItems]
    : secondaryNavItems
  const mobileOverflowItems = user?.isAdmin
    ? [navItemById.downloads, ...secondaryNavItems, ...adminNavItems]
    : [navItemById.downloads, ...secondaryNavItems]

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

  const overflowMenu = (id, items) => (
    <div className="overflow-menu" id={id} role="menu">
      {items.map((item) => (
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
  )

  return (
    <div className="app-shell">
      <nav className="side-nav" aria-label="Primary navigation">
        <button className="side-logo" onClick={() => goTo('home')} aria-label="Aristotool home">
          <LogoMark size={25} />
        </button>

        {desktopNavItems.map((item) => (
          <button
            key={item.id}
            className={`side-item ${activeId === item.id ? 'active' : ''} ${
              item.id === 'community' ? 'chat-nav' : ''
            }`}
            onClick={() => goTo(item.id)}
            aria-current={activeId === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </button>
        ))}

        <div className="side-spacer" />

        <div
          className="overflow-wrap side-overflow"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOverflowOpen(false)
          }}
        >
          <button
            className={`side-item ${overflowOpen ? 'active' : ''}`}
            onClick={() => {
              setOverflowOpen((open) => !open)
              setMenuOpen(false)
            }}
            aria-label="More pages"
            aria-expanded={overflowOpen}
            aria-controls="desktop-page-menu"
            aria-haspopup="menu"
          >
            <Icon name="menu" size={22} />
            <span>More</span>
          </button>
          {overflowOpen && overflowMenu('desktop-page-menu', desktopOverflowItems)}
        </div>
      </nav>

      <header className="top-app-bar">
        <button className="brand" onClick={() => goTo('home')} aria-label="Aristotool home">
          <span className="brand-mark">
            <LogoMark size={23} />
          </span>
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

        <div
          className="overflow-wrap mobile-overflow"
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
            aria-controls="mobile-page-menu"
            aria-haspopup="menu"
          >
            <Icon name="menu" size={20} />
            <span>More</span>
          </button>
          {overflowOpen && overflowMenu('mobile-page-menu', mobileOverflowItems)}
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
        {mobileNavItems.map((item) => (
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
