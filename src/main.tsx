import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './base.css';

type CardCount = 1 | 2 | 4 | 8 | 16 | 32;

type Layout = {
  cols: number;
  rows: number;
  landscape: boolean;
};

type Person = {
  id: number;
  name: string;
  profilePath: string | null;
};

const CARD_COUNTS: CardCount[] = [1, 2, 4, 8, 16, 32];

const LAYOUT_BY_COUNT: Record<CardCount, Layout> = {
  1: { cols: 1, rows: 1, landscape: false },
  2: { cols: 1, rows: 2, landscape: true },
  4: { cols: 2, rows: 2, landscape: false },
  8: { cols: 2, rows: 4, landscape: true },
  16: { cols: 4, rows: 4, landscape: false },
  32: { cols: 4, rows: 8, landscape: true },
};

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

async function fetchPopularPeople(apiKey: string): Promise<Person[]> {
  const pages = Array.from({ length: 50 }, (_, index) => index + 1);
  const responses = await Promise.all(
    pages.map((page) => {
      const url = new URL(`${TMDB_API_BASE}/person/popular`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('language', 'en-US');
      url.searchParams.set('page', String(page));
      return fetch(url);
    }),
  );

  for (const response of responses) {
    if (!response.ok) {
      throw new Error('TMDB request failed');
    }
  }

  const payloads = await Promise.all(
    responses.map(
      (response) =>
        response.json() as Promise<{ results: Array<{ id: number; name: string; profile_path: string | null }> }>,
    ),
  );

  return payloads.flatMap((payload) =>
    payload.results.map((person) => ({
      id: person.id,
      name: person.name,
      profilePath: person.profile_path,
    })),
  );
}

function pickRandom(people: Person[], count: number): Person[] {
  const pool = [...people];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function App() {
  const [apiKey, setApiKey] = useState('');
  const [count, setCount] = useState<CardCount>(4);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [gapMm, setGapMm] = useState(8);
  const [paddingMm, setPaddingMm] = useState(6);
  const [pool, setPool] = useState<Person[]>([]);
  const [cards, setCards] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const layout = useMemo(() => LAYOUT_BY_COUNT[count], [count]);

  const pageStyle = useMemo<React.CSSProperties>(
    () => ({
      gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
      gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
      ['--page-padding' as string]: `${paddingMm}mm`,
      ['--card-gap' as string]: `${gapMm}mm`,
    }),
    [layout.cols, layout.rows, gapMm, paddingMm],
  );

  const handleGenerate = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      window.alert('Enter a TMDB API key.');
      return;
    }

    setIsLoading(true);
    try {
      const pool = await fetchPopularPeople(trimmedKey);
      const withImages = pool.filter((person) => person.profilePath);
      setPool(withImages);
      setCards(pickRandom(withImages, count));
    } catch {
      window.alert('TMDB API key is not valid.');
    } finally {
      setIsLoading(false);
    }
  };

  const replaceCard = (index: number) => {
    setCards((current) => {
      if (!current[index]) {
        return current;
      }
      const usedIds = new Set(current.map((person) => person.id));
      const options = pool.filter((person) => !usedIds.has(person.id));
      if (options.length === 0) {
        return current;
      }
      const next = options[Math.floor(Math.random() * options.length)];
      const updated = [...current];
      updated[index] = next;
      return updated;
    });
  };

  return (
    <div className="app">
      <div className="controls">
        <label className="control control--wide">
          <span className="control-label">TMDB API key</span>
          <input
            type="text"
            id="tmdb-api-key"
            name="tmdb-api-key"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="off"
            inputMode="text"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
          />
        </label>
        <label className="control">
          <span className="control-label">Cards per page</span>
          <select
            id="card-count"
            value={count}
            onChange={(event) => {
              setCount(Number(event.target.value) as CardCount);
              setCards([]);
            }}
          >
            {CARD_COUNTS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="control">
          <span className="control-label">Card gap (mm)</span>
          <input
            type="number"
            id="card-gap"
            min={0}
            step={1}
            value={gapMm}
            onChange={(event) => setGapMm(Number(event.target.value))}
          />
        </label>
        <label className="control">
          <span className="control-label">Page padding (mm)</span>
          <input
            type="number"
            id="page-padding"
            min={0}
            step={1}
            value={paddingMm}
            onChange={(event) => setPaddingMm(Number(event.target.value))}
          />
        </label>
        <div className="control toggle">
          <div className="toggle-buttons">
            <button type="button" onClick={() => setSide('front')} disabled={side === 'front'}>
              Front
            </button>
            <button type="button" onClick={() => setSide('back')} disabled={side === 'back'}>
              Back
            </button>
          </div>
        </div>
        <div className="control buttons">
          <button type="button" onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <div className={`page ${layout.landscape ? 'landscape' : 'portrait'}`} style={pageStyle}>
        {Array.from({ length: count }, (_, index) => {
          const person = cards[index];
          return (
            <div
              className={`card ${person ? '' : 'card-empty'}`}
              key={person?.id ?? `empty-${index}`}
              role={person ? 'button' : undefined}
              tabIndex={person ? 0 : -1}
              onClick={person ? () => replaceCard(index) : undefined}
              onKeyDown={
                person
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        replaceCard(index);
                      }
                    }
                  : undefined
              }
            >
              <div className="card-content">
                {person ? (
                  side === 'front' ? (
                    person.profilePath ? (
                      <img src={`${TMDB_IMAGE_BASE}${person.profilePath}`} alt={person.name} className="card-image" />
                    ) : (
                      <div className="card-placeholder" />
                    )
                  ) : (
                    <div className="card-name">{person.name}</div>
                  )
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing root element');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
