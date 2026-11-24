import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout, { typeByPage } from './components/Layout.jsx'
import ResourceDialog from './components/ResourceDialog.jsx'
import PathDialog from './components/PathDialog.jsx'
import Icon from './components/Icon.jsx'
import Home from './pages/Home.jsx'
import Library from './pages/Library.jsx'
import Learning from './pages/Learning.jsx'
import Downloads from './pages/Downloads.jsx'
import About from './pages/About.jsx'
import Community from './pages/Community.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ConfirmEmail from './pages/ConfirmEmail.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Admin from './pages/Admin.jsx'
import Stats from './pages/Stats.jsx'
import { resources as seedResources, learningPaths as seedPaths, getMedia } from './data/resources.js'
import {
  clearOfflineEntries,
  copyToClipboard,
  downloadCatalog,
  downloadFile,
  downloadOfflineBundle,
  downloadResource,
  readOfflineEntries,
  removeOfflineEntry,
  saveOfflineEntry,
} from './data/downloads.js'
import { api } from './api.js'

const knownPages = [
  'home',
  'library',
  'videos',
  'notes',
  'labs',
  'learning',
  'downloads',
  'community',
  'about',
  'admin',
  'stats',
]

function initialPage() {
  const slug = window.location.pathname.replace(/^\/+|\/+$/g, '')
  return knownPages.includes(slug) ? slug : 'home'
}

export default function App() {
  const initial = initialPage()
  const [theme, setTheme] = useState(() => localStorage.getItem('aristotool-theme') || 'light')
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState(null)
  const [flow, setFlow] = useState('login')
  const [pendingEmail, setPendingEmail] = useState('')
  const [confirmToken, setConfirmToken] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [resources, setResources] = useState(seedResources)
  const [paths, setPaths] = useState(seedPaths)
  const [page, setPage] = useState(typeByPage[initial] ? 'library' : initial)
  const [activeNav, setActiveNav] = useState(initial)
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState(typeByPage[initial] || 'all')
  const [category, setCategory] = useState('all')
  const [bookmarks, setBookmarks] = useState(new Set())
  const [completed, setCompleted] = useState(new Set())
  const [started, setStarted] = useState(new Set())
  const [selectedResource, setSelectedResource] = useState(null)
  const [selectedPath, setSelectedPath] = useState(null)
  const [offlineEntries, setOfflineEntries] = useState(() => readOfflineEntries())
  const [snack, setSnack] = useState('')

  const offlineIds = useMemo(
    () => new Set(offlineEntries.map((entry) => entry.resource?.id)),
    [offlineEntries],
  )

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

  const downloadResourceFile = useCallback((resource, media) => {
    downloadResource(resource, media || resource.media || getMedia(resource.id))
    setSnack('Resource pack downloaded.')
  }, [])

  const saveOfflineResource = useCallback((resource, media) => {
    const saved = saveOfflineEntry(resource, media || resource.media || getMedia(resource.id))
    setOfflineEntries(readOfflineEntries())
    setSnack(saved ? 'Saved offline on this device.' : 'Could not save offline — browser storage is full.')
  }, [])

  const removeOfflineResource = useCallback((id) => {
    removeOfflineEntry(id)
    setOfflineEntries(readOfflineEntries())
    setSnack('Removed offline pack.')
  }, [])

  const clearOfflineResources = useCallback(() => {
    clearOfflineEntries()
    setOfflineEntries([])
    setSnack('Offline packs cleared.')
  }, [])

  const copySourceLink = useCallback(async (url) => {
    const copied = await copyToClipboard(url)
    setSnack(copied ? 'Source link copied.' : 'Could not copy the link.')
  }, [])

  const printResource = useCallback(() => {
    window.print()
  }, [])

  const downloadCatalogFile = useCallback(async () => {
    try {
      const payload = await api.exportCatalog()
      downloadFile(
        'aristotool-catalog.json',
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8',
      )
    } catch {
      downloadCatalog(resources, paths)
    }
    setSnack('Catalog export downloaded.')
  }, [resources, paths])

  const exportProgressFile = useCallback(async () => {
    try {
      const payload = await api.exportProgress()
      downloadFile(
        'aristotool-progress.json',
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8',
      )
      setSnack('Progress export downloaded.')
    } catch {
      setSnack('Could not export progress from the server.')
    }
  }, [])

  const downloadBundle = useCallback(() => {
    downloadOfflineBundle(offlineEntries)
    setSnack('Offline bundle downloaded.')
  }, [offlineEntries])

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
          onRegistered={({ email, devCode }) => {
            setPendingEmail(email)
            setConfirmToken('')
            setDevOtp(devCode || '')
            changeFlow('confirm', '/confirm')
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
          devCode={devOtp}
          onBack={() => changeFlow('register', '/register')}
          onGoLogin={() => changeFlow('login', '/')}
          onNeedsConfirmation={(email) => {
            setPendingEmail(email)
            setConfirmToken('')
            setDevOtp('')
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
          offlineIds={offlineIds}
          onOpen={openResource}
          onBookmark={toggleBookmark}
          onDownload={downloadResourceFile}
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
          offlineIds={offlineIds}
          onOpen={openResource}
          onBookmark={toggleBookmark}
          onDownload={downloadResourceFile}
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
      {page === 'downloads' && (
        <Downloads
          offlineEntries={offlineEntries}
          resources={resources}
          onOpen={openResource}
          onDownload={downloadResourceFile}
          onRemove={removeOfflineResource}
          onClear={clearOfflineResources}
          onDownloadCatalog={downloadCatalogFile}
          onExportProgress={exportProgressFile}
          onDownloadBundle={downloadBundle}
          navigate={navigate}
        />
      )}
      {page === 'about' && <About navigate={navigate} />}
      {page === 'community' && <Community onNotify={setSnack} />}
      {page === 'admin' && user.isAdmin && (
        <Admin
          resources={resources}
          paths={paths}
          onCatalogChange={(catalog) => {
            if (catalog.resources?.length) setResources(catalog.resources)
            if (catalog.paths?.length) setPaths(catalog.paths)
          }}
          onNotify={setSnack}
        />
      )}
      {page === 'stats' && user.isAdmin && <Stats onNotify={setSnack} />}

      {selectedResource && (
        <ResourceDialog
          resource={selectedResource}
          bookmarked={bookmarks.has(selectedResource.id)}
          completed={completed.has(selectedResource.id)}
          offlineSaved={offlineIds.has(selectedResource.id)}
          onClose={() => setSelectedResource(null)}
          onBookmark={() => toggleBookmark(selectedResource)}
          onComplete={() => toggleComplete(selectedResource)}
          onSaveOffline={saveOfflineResource}
          onDownload={downloadResourceFile}
          onPrint={printResource}
          onCopyLink={copySourceLink}
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
