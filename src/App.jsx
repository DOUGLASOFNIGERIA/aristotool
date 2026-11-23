import { useCallback, useEffect, useState } from 'react'
import Layout, { typeByPage } from './components/Layout.jsx'
import ResourceDialog from './components/ResourceDialog.jsx'
import PathDialog from './components/PathDialog.jsx'
import Icon from './components/Icon.jsx'
import Home from './pages/Home.jsx'
import Library from './pages/Library.jsx'
import Learning from './pages/Learning.jsx'
import About from './pages/About.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ConfirmEmail from './pages/ConfirmEmail.jsx'
import Onboarding from './pages/Onboarding.jsx'
import { resources as seedResources, learningPaths as seedPaths } from './data/resources.js'
import { api } from './api.js'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('aristotool-theme') || 'light')
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState(null)
  const [flow, setFlow] = useState('login')
  const [pendingEmail, setPendingEmail] = useState('')
  const [confirmToken, setConfirmToken] = useState('')
  const [resources, setResources] = useState(seedResources)
  const [paths, setPaths] = useState(seedPaths)
  const [page, setPage] = useState('home')
  const [activeNav, setActiveNav] = useState('home')
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [category, setCategory] = useState('all')
  const [bookmarks, setBookmarks] = useState(new Set())
  const [completed, setCompleted] = useState(new Set())
  const [started, setStarted] = useState(new Set())
  const [selectedResource, setSelectedResource] = useState(null)
  const [selectedPath, setSelectedPath] = useState(null)
  const [snack, setSnack] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('aristotool-theme', theme)
  }, [theme])

  useEffect(() => {
    let mounted = true

    async function boot() {
      const params = new URLSearchParams(window.location.search)
      const routeToken = params.get('token')
      const isConfirmRoute = window.location.pathname.startsWith('/confirm')
      if (isConfirmRoute) {
        setFlow('confirm')
        setConfirmToken(routeToken || '')
      }

      try {
        const catalog = await api.catalog()
        if (mounted && catalog.resources?.length) setResources(catalog.resources)
        if (mounted && catalog.paths?.length) setPaths(catalog.paths)
      } catch {
        if (mounted) setSnack('Using cached catalog while the API is unavailable.')
      }

      try {
        const data = await api.me()
        if (!mounted) return
        setUser(data.user)
        if (data.user?.confirmed && !data.user.onboarded) setFlow('onboarding')
        else if (data.user && isConfirmRoute) {
          setFlow(null)
          window.history.replaceState({}, '', '/')
        }
      } catch {
        if (mounted && !isConfirmRoute) setFlow('login')
      } finally {
        if (mounted) setBooting(false)
      }
    }

    boot()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!user?.onboarded) return
    api
      .state()
      .then(({ progress }) => {
        setBookmarks(new Set(progress.bookmarks || []))
        setCompleted(new Set(progress.completed || []))
        setStarted(new Set(progress.started || []))
      })
      .catch(() => setSnack('Could not load your saved progress.'))
  }, [user?.id, user?.onboarded])

  useEffect(() => {
    if (!snack) return undefined
    const timer = setTimeout(() => setSnack(''), 3200)
    return () => clearTimeout(timer)
  }, [snack])

  const changeFlow = useCallback((next, path) => {
    setFlow(next)
    window.history.replaceState({}, '', path || '/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const navigate = useCallback((next) => {
    setActiveNav(next)
    if (typeByPage[next]) {
      setSelectedType(typeByPage[next])
      setPage('library')
    } else {
      setPage(next)
      if (next === 'library') setSelectedType('all')
    }
    window.history.replaceState({}, '', next === 'home' ? '/' : `/${next}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const updateProgress = useCallback(async (resourceId, kind, value) => {
    try {
      await api.setProgress({ resourceId, kind, value })
    } catch {
      setSnack('Saved for this session only — the API is unavailable.')
    }
  }, [])

  const openResource = useCallback(
    (resource) => {
      setSelectedPath(null)
      setSelectedResource(resource)
      if (!started.has(resource.id)) {
        setStarted((current) => new Set(current).add(resource.id))
        updateProgress(resource.id, 'started', true)
      }
    },
    [started, updateProgress],
  )

  const toggleBookmark = useCallback(
    (resource) => {
      const isSaved = bookmarks.has(resource.id)
      setBookmarks((current) => {
        const next = new Set(current)
        if (isSaved) next.delete(resource.id)
        else next.add(resource.id)
        return next
      })
      updateProgress(resource.id, 'bookmarks', !isSaved)
      setSnack(isSaved ? 'Removed from saved resources' : 'Saved to My learning')
    },
    [bookmarks, updateProgress],
  )

  const toggleComplete = useCallback(
    (resource) => {
      const isDone = completed.has(resource.id)
      setCompleted((current) => {
        const next = new Set(current)
        if (isDone) next.delete(resource.id)
        else next.add(resource.id)
        return next
      })
      updateProgress(resource.id, 'completed', !isDone)
      setSnack(isDone ? 'Marked as not complete' : 'Nice work — marked complete')
    },
    [completed, updateProgress],
  )

  const openCategory = useCallback(
    (nextCategory) => {
      setCategory(nextCategory)
      setSelectedType('all')
      setQuery('')
      navigate('library')
    },
    [navigate],
  )

  const handleLogout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      setSnack('Signed out locally.')
    }
    setUser(null)
    setBookmarks(new Set())
    setCompleted(new Set())
    setStarted(new Set())
    setSelectedResource(null)
    setSelectedPath(null)
    changeFlow('login', '/')
  }, [changeFlow])

  const pathItems = selectedPath
    ? resources.filter((item) => selectedPath.resourceIds.includes(item.id))
    : []

  if (booting) {
    return (
      <div className="empty-state" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div>
          <div className="empty-icon">
            <Icon name="shield" size={30} />
          </div>
          <strong>Preparing your learning space…</strong>
        </div>
      </div>
    )
  }

  if (!user) {
    if (flow === 'register') {
      return (
        <Register
          onRegistered={({ email, token }) => {
            setPendingEmail(email)
            setConfirmToken(token)
            changeFlow('confirm', `/confirm?token=${encodeURIComponent(token)}`)
          }}
          onGoLogin={() => changeFlow('login', '/')}
        />
      )
    }
    if (flow === 'confirm') {
      return (
        <ConfirmEmail
          email={pendingEmail}
          token={confirmToken}
          onBack={() => changeFlow('register', '/register')}
          onGoLogin={() => changeFlow('login', '/')}
          onNeedsConfirmation={(email) => {
            setPendingEmail(email)
            setConfirmToken('')
            changeFlow('confirm', '/confirm')
          }}
          onConfirmed={(updated) => {
            setUser(updated)
            changeFlow(updated.onboarded ? null : 'onboarding', '/')
          }}
        />
      )
    }
    return (
      <Login
        onGoRegister={() => changeFlow('register', '/register')}
        onNeedsConfirmation={(email) => {
          setPendingEmail(email)
          setConfirmToken('')
          changeFlow('confirm', '/confirm')
        }}
        onSuccess={(authenticated) => {
          setUser(authenticated)
          changeFlow(authenticated.onboarded ? null : 'onboarding', '/')
        }}
      />
    )
  }

  if (!user.onboarded || flow === 'onboarding') {
    return (
      <Onboarding
        user={user}
        onDone={(updated) => {
          setUser(updated)
          setFlow(null)
          window.history.replaceState({}, '', '/')
        }}
      />
    )
  }

  return (
    <Layout
      page={page}
      activeNav={activeNav}
      navigate={navigate}
      query={query}
      setQuery={setQuery}
      theme={theme}
      toggleTheme={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
      bookmarkCount={bookmarks.size}
      user={user}
      onLogout={handleLogout}
    >
      {page === 'home' && (
        <Home
          user={user}
          resources={resources}
          paths={paths}
          bookmarks={bookmarks}
          completed={completed}
          started={started}
          onOpen={openResource}
          onBookmark={toggleBookmark}
          onOpenPath={setSelectedPath}
          navigate={navigate}
          onCategory={openCategory}
        />
      )}
      {['library', 'videos', 'notes', 'labs'].includes(page) && (
        <Library
          resources={resources}
          query={query}
          setQuery={setQuery}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          category={category}
          setCategory={setCategory}
          bookmarks={bookmarks}
          completed={completed}
          onOpen={openResource}
          onBookmark={toggleBookmark}
        />
      )}
      {page === 'learning' && (
        <Learning
          resources={resources}
          paths={paths}
          bookmarks={bookmarks}
          completed={completed}
          started={started}
          onOpen={openResource}
          onOpenPath={setSelectedPath}
          navigate={navigate}
        />
      )}
      {page === 'about' && <About navigate={navigate} />}

      {selectedResource && (
        <ResourceDialog
          resource={selectedResource}
          bookmarked={bookmarks.has(selectedResource.id)}
          completed={completed.has(selectedResource.id)}
          onClose={() => setSelectedResource(null)}
          onBookmark={() => toggleBookmark(selectedResource)}
          onComplete={() => toggleComplete(selectedResource)}
        />
      )}

      {selectedPath && (
        <PathDialog
          path={selectedPath}
          items={pathItems}
          completed={completed}
          onClose={() => setSelectedPath(null)}
          onOpenResource={openResource}
        />
      )}

      {snack && (
        <div className="snackbar" role="status">
          <Icon name="checkCircle" size={18} />
          <span>{snack}</span>
          <button onClick={() => setSnack('')}>Dismiss</button>
        </div>
      )}
    </Layout>
  )
}
