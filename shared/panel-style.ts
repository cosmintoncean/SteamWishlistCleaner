export const PANEL_CSS = `
#sfwc-panel { position: fixed; right: 16px; bottom: 16px; z-index: 10000; display: flex;
  flex-direction: column-reverse; align-items: flex-end; gap: 8px;
  font: 13px/1.4 Arial, sans-serif; color: #c7d5e0; }
#sfwc-panel [hidden] { display: none !important; }
#sfwc-panel button { padding: 8px 12px; border: 0; border-radius: 3px; background: #1a9fff;
  color: #fff; cursor: pointer; }
#sfwc-panel button:disabled { opacity: 0.5; cursor: default; }
#sfwc-panel .sfwc-body { width: 320px; padding: 12px; border: 1px solid #3d4450;
  border-radius: 4px; background: #1b2838; max-height: 85vh; overflow-y: auto; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5); }
#sfwc-panel .sfwc-status { margin: 0 0 8px; }
#sfwc-panel .sfwc-status:empty::before {
  content: "Find wishlisted games you can already play."; }
#sfwc-panel .sfwc-sources { margin: 0 0 8px; padding: 6px 8px; border: 1px solid #3d4450; }
#sfwc-panel .sfwc-sources label { display: flex; align-items: center; gap: 6px; }
#sfwc-panel input[type="text"] { width: 3em; text-transform: uppercase; }
#sfwc-panel small { display: block; color: #8f98a0; }
#sfwc-panel button.sfwc-select-all { margin: 0 0 6px; padding: 4px 8px; font-size: 11px;
  background: #3d4450; color: #c7d5e0; }
#sfwc-panel .sfwc-list { max-height: 30vh; overflow-y: auto; margin: 0 0 8px; padding: 0;
  list-style: none; }
#sfwc-panel .sfwc-list li { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
#sfwc-panel .sfwc-list a { color: #c7d5e0; }
#sfwc-panel .sfwc-actions { display: flex; flex-wrap: wrap; gap: 8px; }
#sfwc-panel .sfwc-credits { display: flex; justify-content: space-between; gap: 8px;
  margin-top: 10px; padding-top: 8px; border-top: 1px solid #3d4450; font-size: 11px; }
#sfwc-panel .sfwc-credits a { color: #8f98a0; text-decoration: none; }
#sfwc-panel .sfwc-credits a:hover, #sfwc-panel .sfwc-credits a:focus-visible {
  color: #c7d5e0; text-decoration: underline; }
#sfwc-panel .sfwc-brand { font-family: "Space Grotesk", system-ui, sans-serif;
  font-weight: 600; letter-spacing: -0.01em; color: #f1f0f7; }
#sfwc-panel .sfwc-brand b { margin-left: 1px; font-weight: 700; color: transparent;
  background-image: linear-gradient(110deg, #ff8a3d 0%, #ec4899 50%, #8b5cf6 100%);
  -webkit-background-clip: text; background-clip: text; }
`;
