import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import ResourceCard from '../components/ResourceCard.jsx'
import { categories, difficulties, typeIcons } from '../data/resources.js'

const types = [
  { id: 'all', label: 'Everything', icon: 'list' },
  { id: 'video', label: 'Videos', icon: 'play' },
  { id: 'note', label: 'Lecture notes', icon: 'article' },
  { id: 'lab', label: 'Labs', icon: 'science' },
]

export default function Library({
  resources,
  query,
  setQuery,
  selectedType,
  setSelectedType,
  category,
  setCategory,
  bookmarks,
  completed,
  offlineIds,
  onOpen,
  onBookmark,
  onDownload,
}) {
  const [difficulty, setDifficulty] = useState('all')
  const [sort, setSort] = useState('popular')
  const [savedOnly, setSavedOnly] = useState(false)
  const [offlineOnly, setOfflineOnly] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = resources.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) return false
      if (category !== 'all' && item.category !== category) return false
      if (difficulty !== 'all' && item.difficulty !== difficulty) return false
      if (savedOnly && !bookmarks.has(item.id)) return false
      if (offlineOnly && !offlineIds.has(item.id)) return false
      if (!needle) return true
      return [item.title, item.summary, item.category, item.instructor, ...item.tags]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })

    return [...list].sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'shortest') return a.minutes - b.minutes
      if (sort === 'newest') return b.updated.localeCompare(a.updated)
      return b.learners - a.learners
    })
  }, [resources, query, selectedType, category, difficulty, sort, savedOnly, offlineOnly, bookmarks, offlineIds])

  const clearAll = () => {
    setQuery('')
    setSelectedType('all')
    setCategory('all')
    setDifficulty('all')
    setSavedOnly(false)
    setOfflineOnly(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Resource library</p>
          <h1>Explore the toolkit</h1>
          <p className="lead">
            Filter by format, topic and level. Bookmark anything you want to come back to.
          </p>
        </div>
      </div>

      <div className="filter-row">
        {types.map((type) => (
          <button
            key={type.id}
            className={`filter-chip ${selectedType === type.id ? 'selected' : ''}`}
            onClick={() => setSelectedType(type.id)}
          >
            <Icon name={type.icon} />
            {type.label}
          </button>
        ))}
        <button
          className={`filter-chip ${savedOnly ? 'selected' : ''}`}
          onClick={() => setSavedOnly((value) => !value)}
        >
          <Icon name="bookmarkBorder" />
          Saved
        </button>
        <button
          className={`filter-chip ${offlineOnly ? 'selected' : ''}`}
          onClick={() => setOfflineOnly((value) => !value)}
        >
          <Icon name="download" />
          Offline
        </button>
      </div>

      <div className="filter-row">
        <select
          className="select-field"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by topic"
        >
          <option value="all">All topics</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="select-field"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
          aria-label="Filter by difficulty"
        >
          <option value="all">All levels</option>
          {difficulties.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="select-field"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort resources"
        >
          <option value="popular">Most popular</option>
          <option value="rating">Highest rated</option>
          <option value="newest">Recently updated</option>
          <option value="shortest">Shortest first</option>
        </select>
      </div>

      <div className="result-bar">
        <span>
          Showing <strong>{filtered.length}</strong> of {resources.length} resources
          {query.trim() && <> for “{query.trim()}”</>}
        </span>
        <button className="button text small" onClick={clearAll}>
          Clear filters
        </button>
      </div>

      {filtered.length ? (
        <div className="grid cards">
          {filtered.map((item) => (
            <ResourceCard
              key={item.id}
              resource={item}
              bookmarked={bookmarks.has(item.id)}
              completed={completed.has(item.id)}
              offlineSaved={offlineIds.has(item.id)}
              onOpen={onOpen}
              onBookmark={onBookmark}
              onDownload={onDownload}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">
            <Icon name="search" size={32} />
          </div>
          <h2>Nothing matched those filters</h2>
          <p>Try a different keyword or clear a filter or two.</p>
          <button className="button filled" onClick={clearAll}>
            Reset search
          </button>
        </div>
      )}
    </div>
  )
}
