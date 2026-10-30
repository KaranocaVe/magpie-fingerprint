import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowClockwise,
  CaretDown,
  Check,
  CheckCircle,
  CircleNotch,
  Clipboard,
  ClockCounterClockwise,
  DownloadSimple,
  Gauge,
  GithubLogo,
  Info,
  Lightning,
  List,
  MagnifyingGlass,
  Moon,
  Monitor,
  Play,
  SlidersHorizontal,
  Stop,
  Sun,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import type { Bootstrap, Job, Model, RunConfig, Target, TargetResult } from '../src/types';
import './style.css';

declare global {
  interface Window {
    __FINGERPRINT__?: { token?: string; initialProvider?: string; theme?: string; lang?: string };
  }
}
const apiUrl = (path: string) => new URL(path.replace(/^\//, ''), document.baseURI).toString();
const token = () => window.__FINGERPRINT__?.token;
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (token()) headers.set('Authorization', `Bearer ${token()}`);
  if (init?.body) headers.set('content-type', 'application/json');
  const r = await fetch(apiUrl(path), { ...init, headers });
  if (r.status === 401) location.reload();
  if (!r.ok) {
    const data = await r.json().catch(() => null);
    throw new Error(data?.error || `${r.status} ${r.statusText}`);
  }
  return r.json();
}
const zh = {
  detect: '指纹检测',
  history: '检测历史',
  settings: '运行设置',
  ready: '服务已连接',
  offline: '服务离线',
  start: '开始检测',
  cancel: '取消任务',
  search: '搜索模型',
  selected: '已选择',
  noModels: '暂无可用模型',
  provider: '提供商',
  model: '模型',
  account: '账号',
  protocol: '协议',
  effort: '推理强度',
  tier: '服务等级',
  strict: '完整样本',
  targetParallel: '模型并行',
  sampleParallel: '样本并行',
  deadline: '超时（秒）',
  estimated: '预计请求',
  live: '实时进度',
  candidates: '候选排名',
  details: '样本详情',
  export: '导出 JSON',
  demo: '示例数据',
  clear: '清空选择',
  completed: '已完成',
  running: '运行中',
  failed: '失败',
  queued: '排队中',
  cancelled: '已取消',
};
const en = {
  detect: 'Fingerprint',
  history: 'History',
  settings: 'Run settings',
  ready: 'Service connected',
  offline: 'Service offline',
  start: 'Start detection',
  cancel: 'Cancel job',
  search: 'Search models',
  selected: 'selected',
  noModels: 'No models available',
  provider: 'Provider',
  model: 'Model',
  account: 'Account',
  protocol: 'Protocol',
  effort: 'Reasoning effort',
  tier: 'Service tier',
  strict: 'Complete samples',
  targetParallel: 'Model parallelism',
  sampleParallel: 'Sample parallelism',
  deadline: 'Deadline (sec)',
  estimated: 'Estimated requests',
  live: 'Live progress',
  candidates: 'Candidate ranking',
  details: 'Sample details',
  export: 'Export JSON',
  demo: 'Demo data',
  clear: 'Clear selection',
  completed: 'Completed',
  running: 'Running',
  failed: 'Failed',
  queued: 'Queued',
  cancelled: 'Cancelled',
};

const terminal = (state: string) => !['queued', 'running'].includes(state);
const stateLabel = (t: typeof zh, state: string) =>
  ({
    completed: t.completed,
    running: t.running,
    failed: t.failed,
    queued: t.queued,
    cancelled: t.cancelled,
    interrupted: t === zh ? '已中断' : 'Interrupted',
    scored: t === zh ? '已评分' : 'Scored',
    partial: t === zh ? '部分样本' : 'Partial',
    unscorable: t === zh ? '不可评分' : 'Unscorable',
    not_model: t === zh ? '序列不符合检测假设' : 'Unexpected sequence',
    complete: t === zh ? '完成' : 'Complete',
    truncated: t === zh ? '已截断' : 'Truncated',
    waiting: t === zh ? '等待响应' : 'Waiting',
    streaming: t === zh ? '接收中' : 'Streaming',
  })[state] || state;
function Logo() {
  return (
    <div className="brand-mark">
      <span className="brand-dot" />
      <span className="brand-dot" />
      <span className="brand-dot" />
      <span className="brand-dot" />
    </div>
  );
}
function App() {
  const [lang, setLang] = useState<'zh' | 'en'>(() => {
    try {
      return (
        (localStorage.getItem('fp-lang') as 'zh' | 'en') ||
        (window.__FINGERPRINT__?.lang?.startsWith('en') ? 'en' : 'zh')
      );
    } catch {
      return window.__FINGERPRINT__?.lang?.startsWith('en') ? 'en' : 'zh';
    }
  });
  const t = lang === 'zh' ? zh : en;
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      return (localStorage.getItem('fp-theme') as any) || window.__FINGERPRINT__?.theme || 'system';
    } catch {
      return (window.__FINGERPRINT__?.theme as 'light' | 'dark') || 'system';
    }
  });
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<'detect' | 'history'>('detect');
  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<Job[]>([]);
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [account, setAccount] = useState('');
  const [config, setConfig] = useState({
    api: 'auto',
    effort: '',
    serviceTier: 'default',
    strict: false,
    targetParallel: 2,
    sampleParallel: 3,
    deadlineSeconds: 300,
  } as any);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const paint = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    };
    paint();
    media.addEventListener('change', paint);
    try {
      localStorage.setItem('fp-theme', theme);
    } catch {}
    return () => media.removeEventListener('change', paint);
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem('fp-lang', lang);
    } catch {}
  }, [lang]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      const m = e.data;
      if (m?.magpie === 1 && m.event === 'action' && m.data?.provider?.id) {
        setProvider(m.data.provider.id);
        setSection('detect');
      }
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ magpie: 1, id: 'fingerprint-hello', method: 'hello' }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, []);
  const load = async () => {
    setError('');
    try {
      const b = await api<Bootstrap>('api/bootstrap');
      setBoot(b);
      setHistory(b.jobs || []);
      setJob((current) => current || b.jobs.find((j) => !terminal(j.state)) || null);
      if (window.__FINGERPRINT__?.initialProvider)
        setProvider(window.__FINGERPRINT__.initialProvider);
      setError(b.gateway.error || b.bankError || '');
    } catch (e) {
      setError(String(e));
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!job || terminal(job.state)) return;
    const controller = new AbortController();
    const id = job.id;
    const watch = async () => {
      let done = false;
      while (!controller.signal.aborted && !done) {
        try {
          const response = await fetch(apiUrl(`api/jobs/${id}/events`), {
            headers: { Authorization: `Bearer ${token()}` },
            signal: controller.signal,
          });
          if (response.status === 401) location.reload();
          if (!response.ok || !response.body)
            throw new Error(`Progress connection: HTTP ${response.status}`);
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          try {
            while (!controller.signal.aborted) {
              const part = await reader.read();
              if (part.done) break;
              buffer += decoder.decode(part.value, { stream: true });
              let split: number;
              while ((split = buffer.indexOf('\n\n')) >= 0) {
                const event = buffer.slice(0, split);
                buffer = buffer.slice(split + 2);
                const data = event.split('\n').find((line) => line.startsWith('data: '));
                if (!data) continue;
                const next = JSON.parse(data.slice(6)) as Job;
                setJob((current) => (current?.id === id ? next : current));
                setHistory((list) => [next, ...list.filter((j) => j.id !== id)]);
                done = terminal(next.state);
              }
            }
          } finally {
            await reader.cancel().catch(() => {});
          }
        } catch (e) {
          if (!controller.signal.aborted) setError(String(e));
        }
        if (!done && !controller.signal.aborted)
          await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    };
    void watch();
    return () => controller.abort();
  }, [job?.id]);
  const models = boot?.models || [];
  const providers = useMemo(
    () => ['all', ...Array.from(new Set(models.map((m) => m.provider)))],
    [models],
  );
  const filtered = models.filter(
    (m) =>
      (provider === 'all' || m.provider === provider) &&
      `${m.name} ${m.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedModels = models.filter((m) => selected.includes(m.id));
  const effortChoices =
    selectedModels[0]?.efforts.filter((effort) =>
      selectedModels.every((model) => model.efforts.includes(effort)),
    ) || [];
  const effort = effortChoices.includes(config.effort) ? config.effort : '';
  const estimate = selected.length * 3;
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 24 ? [...s, id] : s,
    );
  const setField = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));
  const start = async () => {
    if (!selected.length || starting) return;
    if (account && new Set(selectedModels.map((m) => m.provider)).size > 1) {
      setError(
        lang === 'zh'
          ? '固定账号时请只选择同一提供商的模型。'
          : 'Select models from one provider when pinning an account.',
      );
      return;
    }
    setStarting(true);
    setError('');
    const cfg: RunConfig = {
      targets: selected.map((model) => ({ model, ...(account ? { account } : {}) })),
      api: config.api,
      effort,
      serviceTier: config.serviceTier,
      strict: config.strict,
      targetParallel: Number(config.targetParallel),
      sampleParallel: Number(config.sampleParallel),
      deadlineSeconds: Number(config.deadlineSeconds),
    };
    try {
      const j = await api<Job>('api/jobs', { method: 'POST', body: JSON.stringify(cfg) });
      setJob(j);
      setHistory((h) => [j, ...h.filter((x) => x.id !== j.id)]);
      setExpanded(j.results[0]?.id || null);
    } catch (e) {
      setError(String(e));
    } finally {
      setStarting(false);
    }
  };
  const cancel = async () => {
    if (!job) return;
    try {
      const x = await api<Job>(`api/jobs/${job.id}/cancel`, { method: 'POST' });
      setJob(x);
    } catch (e) {
      setError(String(e));
    }
  };
  const download = async () => {
    if (!job) return;
    try {
      const r = await fetch(apiUrl(`api/jobs/${job.id}/export`), {
        headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      });
      if (!r.ok) throw new Error('Export failed');
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fingerprint-${job.id}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      setError(String(e));
    }
  };
  const deleteJob = async (id: string) => {
    try {
      await api(`api/jobs/${id}`, { method: 'DELETE' });
      setHistory((h) => h.filter((x) => x.id !== id));
      if (job?.id === id) setJob(null);
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo />
          <div>
            <strong>Magpie</strong>
            <span>Fingerprint</span>
          </div>
        </div>
        <div className="side-nav">
          <button
            className={section === 'detect' ? 'active' : ''}
            onClick={() => setSection('detect')}
          >
            <Gauge size={19} />
            <span>{t.detect}</span>
          </button>
          <button
            className={section === 'history' ? 'active' : ''}
            onClick={() => setSection('history')}
          >
            <ClockCounterClockwise size={19} />
            <span>{t.history}</span>
            {history.length > 0 && <em>{history.length}</em>}
          </button>
        </div>
        <div className="sidebar-foot">
          <div className="service-dot">
            <i className={boot?.gateway.reachable ? '' : 'bad'} />
            {!boot
              ? error
                ? t.offline
                : lang === 'zh'
                  ? '正在连接…'
                  : 'Connecting…'
              : boot.gateway.reachable
                ? t.ready
                : t.offline}
          </div>
          <button
            className="icon-button"
            title="GitHub"
            onClick={() =>
              window.open(
                'https://github.com/KaranocaVe/magpie-fingerprint',
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            <GithubLogo size={18} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <Logo />
            <strong>Magpie</strong>
          </div>
          <div className="breadcrumb">
            <span>Magpie</span>
            <b>/</b>
            <strong>{section === 'detect' ? t.detect : t.history}</strong>
          </div>
          <div className="top-actions">
            <button className="text-button" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
              <span className="lang-icon">文</span>
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
            <button
              className="icon-button"
              title="Theme"
              aria-label={lang === 'zh' ? `主题：${theme}` : `Theme: ${theme}`}
              onClick={() =>
                setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
              }
            >
              {theme === 'system' ? (
                <Monitor size={19} />
              ) : theme === 'dark' ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </button>
          </div>
        </header>
        {section === 'history' ? (
          <History
            history={history}
            t={t}
            onSelect={(j) => {
              setJob(j);
              setExpanded(j.results[0]?.id || null);
              setSection('detect');
            }}
            onDelete={deleteJob}
          />
        ) : (
          <>
            <div className="page-head">
              <div>
                <p className="eyebrow">MODEL DIAGNOSTICS</p>
                <h1>{t.detect}</h1>
                <p className="subhead">
                  {lang === 'zh'
                    ? '用同一组挑战，比较不同模型的响应指纹。'
                    : 'Compare model response fingerprints with a shared set of challenges.'}
                </p>
              </div>
              {boot?.demo ? (
                <span className="demo-badge">
                  <Info size={15} />
                  {t.demo}
                </span>
              ) : (
                boot?.bank && (
                  <span className="bank-badge" title={boot.bank.builtAt}>
                    {lang === 'zh' ? '参考库' : 'Reference bank'} · {boot.bank.modelCount ?? '—'}{' '}
                    {lang === 'zh' ? '模型' : 'models'}
                  </span>
                )
              )}
            </div>
            {error && (
              <div className="notice error">
                <WarningCircle size={18} />
                <span>{error}</span>
                <button onClick={load} aria-label={lang === 'zh' ? '重新连接' : 'Reconnect'}>
                  <ArrowClockwise size={16} />
                </button>
              </div>
            )}
            {boot?.demo && (
              <div className="notice demo">
                <Lightning size={18} />
                <span>
                  {lang === 'zh'
                    ? '当前为演示环境，结果带有“示例”标记，不会触碰真实模型凭据。'
                    : 'Demo mode is active. Results are marked and no model credentials are used.'}
                </span>
              </div>
            )}
            <div className="workspace-grid">
              <section className="panel models-panel">
                <div className="panel-title">
                  <div>
                    <h2>{t.model}</h2>
                    <p>
                      {selected.length} {t.selected}
                    </p>
                  </div>
                  <button
                    className="ghost-button"
                    onClick={() => setSelected([])}
                    disabled={!selected.length}
                  >
                    {t.clear}
                  </button>
                </div>
                <div className="filter-row">
                  <div className="search">
                    <MagnifyingGlass size={17} />
                    <input
                      placeholder={t.search}
                      aria-label={t.search}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <select
                    aria-label={t.provider}
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    {providers.map((p) => (
                      <option key={p} value={p}>
                        {p === 'all' ? t.provider : p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="model-list">
                  {filtered.length ? (
                    filtered.map((m) => (
                      <button
                        className={`model-row ${selected.includes(m.id) ? 'chosen' : ''}`}
                        key={m.id}
                        onClick={() => toggle(m.id)}
                        role="checkbox"
                        aria-checked={selected.includes(m.id)}
                      >
                        <span className="check-circle">
                          {selected.includes(m.id) && <Check size={13} weight="bold" />}
                        </span>
                        <span className="model-name">
                          <strong>{m.name}</strong>
                          <small>
                            {m.provider} · {m.id}
                          </small>
                        </span>
                        <span className="model-endpoint">{m.nativeEndpoints?.[0] || 'chat'}</span>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">
                      <List size={26} />
                      <p>
                        {boot
                          ? t.noModels
                          : lang === 'zh'
                            ? '正在加载模型与参考库…'
                            : 'Loading models and reference data…'}
                      </p>
                    </div>
                  )}
                </div>
              </section>
              <section className="panel config-panel">
                <div className="panel-title">
                  <div>
                    <h2>{t.settings}</h2>
                    <p>{lang === 'zh' ? '本次运行参数' : 'Parameters for this run'}</p>
                  </div>
                  <SlidersHorizontal size={20} className="muted" />
                </div>
                <label>
                  {t.account}
                  <input
                    value={account}
                    list="account-options"
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder={
                      lang === 'zh' ? '可选：账号 ID 或名称' : 'Optional account ID or name'
                    }
                  />
                  <datalist id="account-options">
                    {(boot?.accounts || [])
                      .filter(
                        (a) =>
                          !selectedModels.length ||
                          selectedModels.some((m) => m.provider === a.provider),
                      )
                      .map((a) => (
                        <option key={`${a.provider}/${a.id}`} value={a.id}>
                          {a.name} · {a.provider}
                        </option>
                      ))}
                  </datalist>
                </label>
                <div className="two-col">
                  <label>
                    {t.protocol}
                    <select value={config.api} onChange={(e) => setField('api', e.target.value)}>
                      <option value="auto">Auto</option>
                      <option value="chat_completions">chat_completions</option>
                      <option value="responses">responses</option>
                      <option value="messages">messages</option>
                    </select>
                  </label>
                  <label>
                    {t.effort}
                    <select value={effort} onChange={(e) => setField('effort', e.target.value)}>
                      <option value="">Default</option>
                      {effortChoices.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="switch-row">
                  <div>
                    <strong>{lang === 'zh' ? '完整样本' : 'Complete samples'}</strong>
                    <small>
                      {lang === 'zh' ? '仅接受完整的 3 条采样' : 'Require all three samples'}
                    </small>
                  </div>
                  <button
                    className={`switch ${config.strict ? 'on' : ''}`}
                    role="switch"
                    aria-label={t.strict}
                    aria-checked={config.strict}
                    onClick={() => setField('strict', !config.strict)}
                  >
                    <span />
                  </button>
                </div>
                <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                  {showAdvanced ? '−' : '+'}{' '}
                  {lang === 'zh' ? '高级并行与超时' : 'Concurrency & deadline'}
                </button>
                {showAdvanced && (
                  <div className="advanced">
                    <label>
                      {t.tier}
                      <select
                        value={config.serviceTier}
                        onChange={(e) => setField('serviceTier', e.target.value)}
                      >
                        <option value="default">Default</option>
                        <option value="flex">Flex</option>
                        <option value="fast">Fast</option>
                        <option value="ultrafast">Ultra-fast</option>
                      </select>
                    </label>
                    <div className="three-col">
                      <label>
                        {t.targetParallel}
                        <input
                          type="number"
                          min="1"
                          max="3"
                          value={config.targetParallel}
                          onChange={(e) => setField('targetParallel', e.target.value)}
                        />
                      </label>
                      <label>
                        {t.sampleParallel}
                        <input
                          type="number"
                          min="1"
                          max="3"
                          value={config.sampleParallel}
                          onChange={(e) => setField('sampleParallel', e.target.value)}
                        />
                      </label>
                      <label>
                        {t.deadline}
                        <input
                          type="number"
                          min="10"
                          max="900"
                          value={config.deadlineSeconds}
                          onChange={(e) => setField('deadlineSeconds', e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                )}
                <div className="run-footer">
                  <div>
                    <span>{t.estimated}</span>
                    <strong>{estimate}</strong>
                    <small>3 × {selected.length || 0}</small>
                  </div>
                  <button
                    className="primary-button"
                    disabled={
                      !selected.length ||
                      starting ||
                      !boot?.bank ||
                      history.some((j) => !terminal(j.state))
                    }
                    onClick={start}
                  >
                    <Play size={17} weight="fill" />
                    {t.start}
                  </button>
                </div>
              </section>
            </div>
            {job && (
              <JobView
                job={job}
                t={t}
                expanded={expanded}
                setExpanded={setExpanded}
                onCancel={cancel}
                onDownload={download}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function JobView({
  job,
  t,
  expanded,
  setExpanded,
  onCancel,
  onDownload,
}: {
  job: Job;
  t: any;
  expanded: string | null;
  setExpanded: (x: string | null) => void;
  onCancel: () => void;
  onDownload: () => void;
}) {
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const exportArea = useRef<HTMLTextAreaElement>(null);
  const total = job.results.length || job.config.targets.length;
  const done = job.results.filter((r) => r.state === 'completed').length;
  const finishedSamples = job.results
    .flatMap((r) => r.samples)
    .filter((s) => !['queued', 'waiting', 'streaming'].includes(s.state)).length;
  const json = JSON.stringify({ schema: 'magpie-fingerprint/v1', ...job }, null, 2);
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(json);
      setCopied(true);
    } catch {
      exportArea.current?.focus();
      exportArea.current?.select();
      setCopied(document.execCommand('copy'));
    }
  };
  return (
    <section className="results">
      <div className="results-head">
        <div>
          <div className="eyebrow">RUN {job.id.slice(0, 8)}</div>
          <h2>{t.live}</h2>
        </div>
        <div className="result-actions">
          <span className={`status ${job.state}`}>
            {job.state === 'running' && <CircleNotch className="spin" size={14} />}{' '}
            {stateLabel(t, job.state)}
          </span>
          {['queued', 'running'].includes(job.state) ? (
            <button className="danger-button" onClick={onCancel}>
              <Stop size={16} />
              {t.cancel}
            </button>
          ) : (
            <button className="ghost-button" onClick={() => setShowExport(true)}>
              <DownloadSimple size={16} />
              {t.export}
            </button>
          )}
        </div>
      </div>
      <div className="progress-track">
        <i
          style={{
            width: `${total ? Math.round((finishedSamples / (total * 3)) * 100) : 0}%`,
          }}
        />
      </div>
      <div className="result-meta">
        <span>
          {finishedSamples}/{total * 3} {t === zh ? '条采样已结束' : 'samples finished'} · {done}/
          {total} {t === zh ? '个模型完成' : 'models completed'}
        </span>
        <span>
          {job.demo && <b className="demo-chip">{t.demo}</b>}
          {new Date(job.createdAt).toLocaleString()}
        </span>
      </div>
      <div className="run-context">
        <span title={job.bank.builtAt}>
          {t === zh ? '参考库' : 'Reference'}: {job.bank.builtAt.slice(0, 19)}
        </span>
        <span>SDK {job.bank.sdk}</span>
        <span>
          {job.config.effort || 'default'} · {job.config.serviceTier}
        </span>
      </div>
      {job.error && (
        <div className="notice error" role="alert">
          {job.error}
        </div>
      )}
      <details className="challenge-details">
        <summary>
          {t === zh ? '本批次共享的 3 个挑战' : 'Three challenges shared across this batch'}
        </summary>
        {job.challenges.map((c, i) => (
          <div key={c.id}>
            <b>
              {i + 1} · {c.expected_count} {t === zh ? '个数字' : 'numbers'}
            </b>
            <p>{c.prompt}</p>
          </div>
        ))}
      </details>
      {job.results.map((r: TargetResult) => (
        <ResultRow
          key={r.id}
          r={r}
          demo={job.demo}
          t={t}
          expanded={expanded === r.id}
          toggle={() => setExpanded(expanded === r.id ? null : r.id)}
        />
      ))}
      {showExport && (
        <div
          className="export-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={t.export}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowExport(false);
          }}
        >
          <div className="export-head">
            <strong>{t.export}</strong>
            <button
              className="icon-button"
              aria-label={t === zh ? '关闭导出' : 'Close export'}
              onClick={() => setShowExport(false)}
            >
              ×
            </button>
          </div>
          <textarea ref={exportArea} aria-label="JSON" autoFocus readOnly value={json} />
          <div>
            <button className="primary-button" onClick={copy}>
              <Clipboard size={16} />{' '}
              {copied ? (t === zh ? '已复制' : 'Copied') : t === zh ? '复制 JSON' : 'Copy JSON'}
            </button>
            {window.self === window.top && (
              <button className="ghost-button" onClick={onDownload}>
                <DownloadSimple size={16} />
                {t === zh ? '下载文件' : 'Download file'}
              </button>
            )}
            <small>
              {t === zh
                ? '也可选中文本后手动复制保存。'
                : 'You can also select and copy the text manually.'}
            </small>
          </div>
        </div>
      )}
    </section>
  );
}
function ResultRow({
  r,
  demo,
  t,
  expanded,
  toggle,
}: {
  r: TargetResult;
  demo?: boolean;
  t: any;
  expanded: boolean;
  toggle: () => void;
}) {
  const analysis = r.analysis;
  const candidates = analysis?.results || [];
  const decision = analysis?.decision;
  return (
    <div className={`result-card ${r.state}`}>
      <button className="result-summary" onClick={toggle}>
        <span className="result-icon">
          {r.state === 'completed' ? (
            <CheckCircle size={20} />
          ) : r.state === 'failed' ? (
            <WarningCircle size={20} />
          ) : (
            <CircleNotch size={20} className={r.state === 'running' ? 'spin' : ''} />
          )}
        </span>
        <span className="result-model">
          <strong>{r.target.model}</strong>
          <small>
            {r.api} · {stateLabel(t, r.state)}
          </small>
        </span>
        <span className="result-label">
          {analysis?.prediction_name || (decision ? stateLabel(t, decision) : '—')}
          <small>{demo ? t.demo : decision ? stateLabel(t, decision) : ''}</small>
        </span>
        <CaretDown size={17} className={expanded ? 'rotate' : ''} />
      </button>
      {expanded && (
        <div className="result-body">
          <div className="candidate-head">
            <h3>{t.candidates}</h3>
            <span>
              {analysis?.probability_status === 'reference_calibrated'
                ? t === zh
                  ? '参考库内概率'
                  : 'Within-bank probability'
                : t === zh
                  ? '排名分数（非概率）'
                  : 'Ranking score (not probability)'}
            </span>
          </div>
          {candidates.length ? (
            candidates.slice(0, 5).map((c, i) => (
              <div className="candidate" key={i}>
                <span>{i + 1}</span>
                <div>
                  <div className="candidate-label">
                    <strong>{c.display_name || c.model || 'Unknown'}</strong>
                    <em>
                      {c.probability == null
                        ? c.score.toFixed(3)
                        : `${(c.probability * 100).toFixed(1)}%`}
                    </em>
                  </div>
                  <div className="bar">
                    <i
                      style={{
                        width: `${c.probability == null ? Math.max(6, 100 - i * 18) : Math.max(1, Math.min(100, c.probability * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="muted-line">
              {r.error ||
                (decision === 'partial'
                  ? 'Partial result'
                  : decision === 'unscorable'
                    ? 'Unscorable'
                    : decision === 'not_model'
                      ? 'Not a model reply'
                      : t === zh
                        ? '暂未产生可评分候选。'
                        : 'No scored candidates yet.')}
            </div>
          )}
          {analysis && (
            <p className="evidence-note">
              {t === zh
                ? `有效样本 ${analysis.used_outputs}/3 · 家族 ${analysis.family_prediction_name || '—'}。概率仅在参考库候选之间分配，库外模型也可能得到相近候选。`
                : `${analysis.used_outputs}/3 usable samples · Family ${analysis.family_prediction_name || '—'}. Probabilities cover reference-bank candidates only; an unseen model can still rank close.`}
            </p>
          )}
          {r.error && <p className="notice error">{r.error}</p>}
          <div className="sample-grid">
            {r.samples.map((sample, i) => (
              <div className="sample-tile" key={i}>
                <header>
                  <b>
                    {t === zh ? '采样' : 'Sample'} {i + 1}
                  </b>
                  <span className={`status ${sample.state}`}>{stateLabel(t, sample.state)}</span>
                </header>
                <strong>
                  {sample.count}
                  <small> / {sample.expected_count}</small>
                </strong>
                <code>
                  {r.provenance[i]?.model || (t === zh ? '路由待确认' : 'Route unverified')}
                </code>
                {r.provenance[i]?.mismatch && (
                  <em>{t === zh ? '实际路由已变化' : 'Route changed'}</em>
                )}
                {sample.error && <small>{sample.error}</small>}
              </div>
            ))}
          </div>
          <details>
            <summary>{t.details}</summary>
            <pre>{JSON.stringify({ samples: r.samples, provenance: r.provenance }, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
function History({
  history,
  t,
  onSelect,
  onDelete,
}: {
  history: Job[];
  t: any;
  onSelect: (j: Job) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="history-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">ARCHIVE</p>
          <h1>{t.history}</h1>
          <p className="subhead">
            {t === zh
              ? `本地保存了 ${history.length} 次检测`
              : `${history.length} runs saved locally`}
          </p>
        </div>
        <button className="ghost-button" onClick={() => location.reload()}>
          <ArrowClockwise size={16} /> {t === zh ? '刷新' : 'Refresh'}
        </button>
      </div>
      <div className="history-list">
        {history.length ? (
          history.map((j) => (
            <div className="history-row" key={j.id}>
              <button onClick={() => onSelect(j)}>
                <span className={`history-state ${j.state}`} />
                <span>
                  <strong>{j.id.slice(0, 12)}</strong>
                  <small>
                    {new Date(j.createdAt).toLocaleString()} · {j.config.targets.length}{' '}
                    {t === zh ? '个模型' : 'models'}
                  </small>
                </span>
              </button>
              <span className={`status ${j.state}`}>
                {j.demo ? t.demo : stateLabel(t, j.state)}
              </span>
              <button
                className="icon-button danger-icon"
                title={t === zh ? '删除' : 'Delete'}
                onClick={() => onDelete(j.id)}
              >
                <Trash size={17} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-history">
            <ClockCounterClockwise size={32} />
            <p>{t === zh ? '还没有检测记录' : 'No detection history yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
