/* ======================================================
   HCCS-DRM Integrated Survey — Application Logic
   Episode management, diagnosis, HCCS questions, export
   ====================================================== */

(function () {
    'use strict';

    // ──────────────── State ────────────────
    const state = {
        episodes: [],
        selectedEpisodeIds: [],
        diagnoses: {},
        barrier: null,
        currentPart: 'intro',
    };

    let episodeIdCounter = 0;

    // ──────────────── DOM References ────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const episodeList = $('#episodeList');
    const addEpisodeBtn = $('#addEpisodeBtn');
    const episodeCountText = $('#episodeCountText');
    const episodeCountBadge = $('#episodeCount');

    const toPart3Btn = $('#toPart3Btn');
    const completeBtn = $('#completeBtn');

    const episodeSelectGrid = $('#episodeSelectGrid');
    const selectedCountText = $('#selectedCountText');
    const selectedCountBadge = $('#selectedCountBadge');
    const startDiagnosisBtn = $('#startDiagnosisBtn');
    const diagnosisForms = $('#diagnosisForms');


    const toastEl = $('#toast');

    // ──────────────── Toast ────────────────
    let toastTimer;
    function showToast(msg, type = 'success') {
        clearTimeout(toastTimer);
        toastEl.textContent = msg;
        toastEl.className = 'toast ' + type;
        requestAnimationFrame(() => toastEl.classList.add('show'));
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
    }

    // ──────────────── Navigation ────────────────
    const TOTAL_PARTS = 6;
    function goToPart(n) {
        state.currentPart = n;
        $$('.part-section').forEach((s) => s.classList.remove('active'));

        const progressBar = $('#progressBar');

        if (n === 'intro') {
            $('#partIntro').classList.add('active');
            progressBar.style.display = 'none';
        } else if (n === 'done') {
            $('#completionScreen').classList.add('active');
            progressBar.style.display = 'flex';
            updateProgressSteps(TOTAL_PARTS + 1);
        } else {
            $(`#part${n}`).classList.add('active');
            progressBar.style.display = 'flex';
            updateProgressSteps(n);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        saveState();
    }

    function updateProgressSteps(active) {
        $$('.progress-step').forEach((el) => {
            const step = el.dataset.step;
            if (!step) return;
            const num = parseInt(step);
            el.classList.remove('active', 'completed');

            if (!isNaN(num)) {
                if (num < active) el.classList.add('completed');
                else if (num === active) el.classList.add('active');
            } else {
                // line segments  "1-2", "2-3"
                const first = parseInt(step.split('-')[0]);
                if (first < active) el.classList.add('completed');
                else if (first === active - 1 && active > 1) el.classList.add('completed');
            }
        });
    }

    // ──────────────── Part 1: Episodes ────────────────
    function createEpisode(data) {
        const id = ++episodeIdCounter;
        const ep = {
            id,
            startTime: data?.startTime || '',
            endTime: data?.endTime || '',
            activity: data?.activity || '',
            location: data?.location || '',
            companion: data?.companion || '',
        };
        state.episodes.push(ep);
        renderEpisodeCard(ep);
        updateEpisodeCount();
        saveState();
        return ep;
    }

    function renderEpisodeCard(ep) {
        const idx = state.episodes.findIndex((e) => e.id === ep.id) + 1;
        const card = document.createElement('div');
        card.className = 'glass-card episode-card';
        card.dataset.id = ep.id;
        card.innerHTML = `
      <div class="episode-card__number">에피소드 ${idx}</div>
      <div class="episode-card__row">
        <div class="form-group">
          <label class="form-label">시작 시간</label>
          <input type="time" class="form-input ep-start" value="${ep.startTime}" />
        </div>
        <div class="form-group">
          <label class="form-label">종료 시간</label>
          <input type="time" class="form-input ep-end" value="${ep.endTime}" />
        </div>
      </div>
      <div class="episode-card__row">
        <div class="form-group">
          <label class="form-label">활동 내용</label>
          <input type="text" class="form-input ep-activity" value="${escHtml(ep.activity)}"
            placeholder="예: 수학 수업, 점심, 유튜브 시청" />
        </div>
        <div class="form-group">
          <label class="form-label">장소</label>
          <input type="text" class="form-input ep-location" value="${escHtml(ep.location)}"
            placeholder="예: 교실, 집, 학원" />
        </div>
      </div>
      <div class="episode-card__row episode-card__row--full">
        <div class="form-group">
          <label class="form-label">함께한 사람</label>
          <input type="text" class="form-input ep-companion" value="${escHtml(ep.companion)}"
            placeholder="예: 친구, 가족, 혼자" />
        </div>
      </div>
      <div class="episode-card__actions">
        <button class="btn btn-secondary btn-sm btn-move-up" type="button" title="위로 이동">↑</button>
        <button class="btn btn-secondary btn-sm btn-move-down" type="button" title="아래로 이동">↓</button>
        <button class="btn btn-danger btn-sm btn-delete" type="button">삭제</button>
      </div>
    `;

        // Input listeners
        card.querySelector('.ep-start').addEventListener('change', (e) => { ep.startTime = e.target.value; saveState(); });
        card.querySelector('.ep-end').addEventListener('change', (e) => { ep.endTime = e.target.value; saveState(); });
        card.querySelector('.ep-activity').addEventListener('input', (e) => { ep.activity = e.target.value; saveState(); });
        card.querySelector('.ep-location').addEventListener('input', (e) => { ep.location = e.target.value; saveState(); });
        card.querySelector('.ep-companion').addEventListener('input', (e) => { ep.companion = e.target.value; saveState(); });

        // Action buttons
        card.querySelector('.btn-delete').addEventListener('click', () => {
            state.episodes = state.episodes.filter((e) => e.id !== ep.id);
            card.style.opacity = '0';
            card.style.transform = 'translateX(40px)';
            setTimeout(() => {
                card.remove();
                refreshEpisodeNumbers();
                updateEpisodeCount();
                saveState();
            }, 300);
        });

        card.querySelector('.btn-move-up').addEventListener('click', () => moveEpisode(ep.id, -1));
        card.querySelector('.btn-move-down').addEventListener('click', () => moveEpisode(ep.id, 1));

        episodeList.appendChild(card);
    }

    function moveEpisode(id, dir) {
        const idx = state.episodes.findIndex((e) => e.id === id);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= state.episodes.length) return;
        [state.episodes[idx], state.episodes[newIdx]] = [state.episodes[newIdx], state.episodes[idx]];
        rebuildEpisodeList();
        saveState();
    }

    function rebuildEpisodeList() {
        episodeList.innerHTML = '';
        state.episodes.forEach((ep) => renderEpisodeCard(ep));
    }

    function refreshEpisodeNumbers() {
        episodeList.querySelectorAll('.episode-card').forEach((card, i) => {
            card.querySelector('.episode-card__number').textContent = `에피소드 ${i + 1}`;
        });
    }

    function updateEpisodeCount() {
        const n = state.episodes.length;
        episodeCountText.textContent = `에피소드 ${n}개`;
        episodeCountBadge.className = 'episode-count' + (n >= 10 ? ' good' : n >= 5 ? '' : ' warning');
    }

    // ──────────────── Part 2: Selection ────────────────
    function populateEpisodeSelection() {
        episodeSelectGrid.innerHTML = '';
        state.selectedEpisodeIds = [];
        updateSelectedCount();

        state.episodes.forEach((ep, i) => {
            if (!ep.activity.trim()) return; // skip empty
            const item = document.createElement('label');
            item.className = 'episode-select-item';
            item.dataset.id = ep.id;
            item.innerHTML = `
        <input type="checkbox" value="${ep.id}" />
        <div class="episode-select-item__check">✓</div>
        <div class="episode-select-item__info">
          <div class="episode-select-item__time">${formatTime(ep.startTime)} ~ ${formatTime(ep.endTime)}</div>
          <div class="episode-select-item__title">${escHtml(ep.activity)} ${ep.location ? '· ' + escHtml(ep.location) : ''}</div>
        </div>
      `;
            const cb = item.querySelector('input');
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    if (state.selectedEpisodeIds.length >= 5) {
                        cb.checked = false;
                        showToast('최대 5개까지 선택할 수 있습니다.', 'error');
                        return;
                    }
                    state.selectedEpisodeIds.push(ep.id);
                    item.classList.add('selected');
                } else {
                    state.selectedEpisodeIds = state.selectedEpisodeIds.filter((x) => x !== ep.id);
                    item.classList.remove('selected');
                }
                updateSelectedCount();
            });
            episodeSelectGrid.appendChild(item);
        });
    }

    function updateSelectedCount() {
        const n = state.selectedEpisodeIds.length;
        selectedCountText.textContent = `${n}개 선택됨`;
        selectedCountBadge.className = 'episode-count' + (n >= 3 && n <= 5 ? ' good' : n > 0 ? '' : ' warning');
    }

    // ──────────────── Part 2: Diagnosis Forms ────────────────
    function buildDiagnosisForms() {
        diagnosisForms.innerHTML = '';
        state.diagnoses = {};

        state.selectedEpisodeIds.forEach((id, i) => {
            const ep = state.episodes.find((e) => e.id === id);
            if (!ep) return;

            state.diagnoses[id] = {
                information: null,
                informationSources: [],
                informationSourceEtc: '',
                time: null,
                opportunityChosen: null,
                opportunityFlexible: null,
                eudaimonia: { growth: 4, autonomy: 4, flow: 4, belonging: 4, meaning: 4 },
            };

            const uid = `diag_${id}`;
            const card = document.createElement('div');
            card.className = 'glass-card diagnosis-card';
            card.innerHTML = `
        <!-- Episode Header -->
        <div class="episode-diagnosis-header">
          <div class="episode-diagnosis-header__number">${i + 1}</div>
          <div class="episode-diagnosis-header__info">
            <div class="episode-diagnosis-header__title">${escHtml(ep.activity)}</div>
            <div class="episode-diagnosis-header__time">${formatTime(ep.startTime)} ~ ${formatTime(ep.endTime)} ${ep.location ? '· ' + escHtml(ep.location) : ''}</div>
          </div>
        </div>

        <!-- 1. Information -->
        <div class="diagnosis-section-divider">
          <div class="diagnosis-section-divider__line"></div>
          <span class="diagnosis-section-divider__label">📡 정보 (Information)</span>
          <div class="diagnosis-section-divider__line"></div>
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.8rem;">
          이 활동 중에 나의 진로나 대학 진학에 도움이 되는 정보를 얻었나요?
        </p>
        <div class="radio-group" data-field="information" data-ep="${id}">
          <label class="radio-option">
            <input type="radio" name="${uid}_info" value="none" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">전혀 없음</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="${uid}_info" value="some" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">조금 있음</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="${uid}_info" value="very" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">매우 유익함</span>
          </label>
        </div>
        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label">그 정보는 누구(무엇)을 통해 얻었나요? (중복응답 가능)</label>
          <div class="checkbox-grid info-source-grid" data-ep="${id}">
            <label class="checkbox-option"><input type="checkbox" name="${uid}_infoSrc" value="친구"><span>친구</span></label>
            <label class="checkbox-option"><input type="checkbox" name="${uid}_infoSrc" value="선생님"><span>선생님</span></label>
            <label class="checkbox-option"><input type="checkbox" name="${uid}_infoSrc" value="부모님"><span>부모님</span></label>
            <label class="checkbox-option"><input type="checkbox" name="${uid}_infoSrc" value="SNS"><span>SNS</span></label>
            <label class="checkbox-option"><input type="checkbox" name="${uid}_infoSrc" value="AI"><span>AI</span></label>
            <label class="checkbox-option"><input type="checkbox" name="${uid}_infoSrc" value="기타"><span>기타</span></label>
          </div>
          <input type="text" class="form-input info-source-etc" data-ep="${id}"
            placeholder="기타를 선택한 경우, 구체적으로 적어 주세요" style="margin-top:0.5rem; display:none;" />
        </div>

        <!-- 2. Time -->
        <div class="diagnosis-section-divider">
          <div class="diagnosis-section-divider__line"></div>
          <span class="diagnosis-section-divider__label">⏳ 시간 (Time)</span>
          <div class="diagnosis-section-divider__line"></div>
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.8rem;">
          이 시간을 보낼 때 여러분의 느낌은 어땠나요?
        </p>
        <div class="radio-group" data-field="time" data-ep="${id}">
          <label class="radio-option">
            <input type="radio" name="${uid}_time" value="pressure" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">시간에 쫓겨 압박감을 느꼈다 (경쟁, 독촉)</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="${uid}_time" value="meaningless" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">나에게는 무의미하게 흘러가는 시간이었다 (방치, 지루함)</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="${uid}_time" value="flow" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">내가 주도적으로 몰입할 수 있는 시간이었다 (성장)</span>
          </label>
        </div>

        <!-- 3. Opportunity -->
        <div class="diagnosis-section-divider">
          <div class="diagnosis-section-divider__line"></div>
          <span class="diagnosis-section-divider__label">🚪 기회 (Opportunity)</span>
          <div class="diagnosis-section-divider__line"></div>
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.8rem;">
          이 활동은 내가 원해서 선택한 것인가요?
        </p>
        <div class="radio-group" data-field="opportunityChosen" data-ep="${id}">
          <label class="radio-option">
            <input type="radio" name="${uid}_opp1" value="yes" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">예, 나의 선택입니다.</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="${uid}_opp1" value="no" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">아니요, 제도나 환경 때문에 어쩔 수 없이 하는 것입니다.</span>
          </label>
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.8rem;">
          이 상황에서 내가 다른 선택을 하고 싶을 때, 학교는 이를 허용(지원)하나요?
        </p>
        <div class="radio-group" data-field="opportunityFlexible" data-ep="${id}">
          <label class="radio-option">
            <input type="radio" name="${uid}_opp2" value="yes" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">예 (유연함)</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="${uid}_opp2" value="no" />
            <span class="radio-option__dot"></span>
            <span class="radio-option__text">아니요 (장벽 존재)</span>
          </label>
        </div>

        <!-- 4. 유데모니아 웰빙 -->
        <div class="diagnosis-section-divider">
          <div class="diagnosis-section-divider__line"></div>
          <span class="diagnosis-section-divider__label">🌱 유데모니아 웰빙 (Eudaimonia)</span>
          <div class="diagnosis-section-divider__line"></div>
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">
          이 활동 중 느낀던 경험의 점수를 매겨 주세요. (1점: 전혀 아님 ~ 7점: 매우 그렇다)
        </p>

        ${buildSlider(id, 'growth', '🌱 내가 성장하고 있다는 느낌')}
        ${buildSlider(id, 'autonomy', '💪 스스로 선택하고 결정하는 느낌')}
        ${buildSlider(id, 'flow', '🔥 무언가에 몰입한 경험')}
        ${buildSlider(id, 'belonging', '🤝 다른 사람과 연결된 느낌')}
        ${buildSlider(id, 'meaning', '✨ 의미 있는 활동이라는 느낌')}
      `;

            // Bind radio groups
            card.querySelectorAll('.radio-group').forEach((rg) => {
                const field = rg.dataset.field;
                const epId = parseInt(rg.dataset.ep);
                rg.querySelectorAll('input[type="radio"]').forEach((radio) => {
                    radio.addEventListener('change', () => {
                        if (state.diagnoses[epId]) {
                            state.diagnoses[epId][field] = radio.value;
                        }
                        saveState();
                    });
                });
            });

            // Bind sliders
            card.querySelectorAll('input[type="range"]').forEach((slider) => {
                const epId = parseInt(slider.dataset.ep);
                const dim = slider.dataset.dim;
                slider.addEventListener('input', () => {
                    const val = parseInt(slider.value);
                    if (state.diagnoses[epId]) {
                        state.diagnoses[epId].eudaimonia[dim] = val;
                    }
                    const valSpan = slider.parentElement.querySelector('.slider-label__value');
                    valSpan.textContent = val;
                    valSpan.className = `slider-label__value slider-val-${val}`;
                    saveState();
                });
            });

            // Bind info source checkboxes
            const infoSrcGrid = card.querySelector('.info-source-grid');
            const infoSrcEtcInput = card.querySelector('.info-source-etc');
            if (infoSrcGrid) {
                infoSrcGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
                    cb.addEventListener('change', () => {
                        if (state.diagnoses[id]) {
                            const checked = [...infoSrcGrid.querySelectorAll('input[type="checkbox"]:checked')].map(c => c.value);
                            state.diagnoses[id].informationSources = checked;
                            // Show/hide '기타' text input
                            if (infoSrcEtcInput) {
                                infoSrcEtcInput.style.display = checked.includes('기타') ? 'block' : 'none';
                            }
                        }
                        saveState();
                    });
                });
            }
            if (infoSrcEtcInput) {
                infoSrcEtcInput.addEventListener('input', (e) => {
                    if (state.diagnoses[id]) state.diagnoses[id].informationSourceEtc = e.target.value;
                    saveState();
                });
            }

            diagnosisForms.appendChild(card);
        });
    }

    function buildSlider(epId, dim, label) {
        return `
      <div class="slider-group">
        <div class="slider-label">
          <span class="slider-label__name">${label}</span>
          <span class="slider-label__value slider-val-4">4</span>
        </div>
        <div class="slider-scale">
          <span>1 전혀 아님</span>
          <span>4 보통</span>
          <span>7 매우 그렇다</span>
        </div>
        <input type="range" min="1" max="7" value="4" data-ep="${epId}" data-dim="${dim}" />
      </div>
    `;
    }

    // ──────────────── Dynamic Content Generation ────────────────
    function makeLikert(name, max, hint1, hint2) {
        let h = '';
        if (hint1) h += `<div class="likert-scale__hint"><span>${hint1}</span></div>`;
        h += '<div class="likert-scale">';
        for (let i = 1; i <= max; i++) h += `<label class="likert-radio"><input type="radio" name="${name}" value="${i}"><span>${i}</span></label>`;
        h += '</div>';
        return h;
    }
    function makeLikert7(name, label) {
        return `<div class="likert-item"><span class="likert-item__label">${label}</span>${makeLikert(name, 7)}</div>`;
    }
    function makeRadioGroup(name, options) {
        return '<div class="barrier-options">' + options.map(o =>
            `<label class="barrier-option" data-value="${o.v}"><input type="radio" name="${name}" value="${o.v}"/><div class="barrier-option__icon">${o.icon}</div><div class="barrier-option__content"><div class="barrier-option__title">${o.t}</div></div></label>`
        ).join('') + '</div>';
    }
    function makeCheckboxGroup(name, options) {
        return '<div class="checkbox-grid">' + options.map(o =>
            `<label class="checkbox-option"><input type="checkbox" name="${name}" value="${o}"/><span>${o}</span></label>`
        ).join('') + '</div>';
    }
    function qCard(badge, title, inner, desc) {
        return `<div class="glass-card"><h3 class="part3-q-title"><span class="part3-q-badge part3-q-badge--info">${badge}</span> ${title}</h3>${desc ? `<p class="part3-q-desc">${desc}</p>` : ''}${inner}</div>`;
    }

    function buildPart3Content() {
        const el = $('#part3Content'); if (!el) return;
        el.innerHTML =
            qCard('Q1', '과목 선택 시 가장 중요하게 고려한 요소', makeRadioGroup('q1', [
                { v: '진로연계', icon: '🎯', t: '진로·대학 전공 연계' }, { v: '성적유리', icon: '📊', t: '좋은 성적 받기 유리' },
                { v: '흥미', icon: '💡', t: '나의 흥미와 관심' }, { v: '친구', icon: '👫', t: '친구들과 같은 수업' },
                { v: '선생님추천', icon: '👨‍🏫', t: '선생님/부모님 추천' }])) +
            qCard('Q2', '원하는 선택과목 개설 충분성', '<div class="likert-item">' + makeLikert('q2', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '나의 진로와 흥미에 맞는 선택과목이 우리 학교에 충분히 개설되어 있다.') +
            qCard('Q3', '과목 선택 안내 및 정보 제공', '<div class="likert-item">' + makeLikert('q3', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '과목 선택 시 학교(교사)로부터 충분한 정보와 안내를 받았다.') +
            qCard('Q4', '진로와 선택과목의 연계', '<div class="likert-item">' + makeLikert('q4', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '내가 선택한 과목들이 나의 진로와 잘 연결된다고 느낀다.') +
            qCard('Q5', '과목 선택 시 겪은 어려움 (복수 응답)', makeCheckboxGroup('q5',
                ['과목 정보 부족', '원하는 과목 미개설', '시간표 충돌', '진로 미결정', '성적 부담', '친구와 다른 수업', '담당 교사 부족', '특별한 어려움 없음'])) +
            qCard('Q6', '과목 선택 개선 희망 사항', '<textarea class="form-textarea" id="q6" placeholder="과목 선택 제도에서 개선이 필요한 점을 자유롭게 적어 주세요."></textarea>') +
            // Assessment section
            '<h3 style="color:var(--text-primary);margin:2rem 0 1rem;text-align:center;">📊 평가 및 학점 이수</h3>' +
            qCard('Q7', '성취평가제(A~E) 이해도', '<div class="likert-item">' + makeLikert('q7', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '나는 성취평가제(절대평가 A~E)가 무엇인지 잘 이해하고 있다.') +
            qCard('Q8', '성취평가제 공정성', '<div class="likert-item">' + makeLikert('q8', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '성취평가제(절대평가)는 학생을 공정하게 평가할 수 있는 제도라고 생각한다.') +
            qCard('Q9', '5등급 상대평가 병기', '<div class="likert-item">' + makeLikert('q9', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '성취도(A~E)와 함께 5등급 상대평가를 병기하는 방식은 적절하다고 생각한다.') +
            qCard('Q10', '미이수 제도 인식', '<div class="likert-item">' + makeLikert('q10', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '성취율 40% 미만 시 미이수(I) 처리 후 보충학습을 받는 제도는 학습에 도움이 된다.') +
            qCard('Q11', '현행 평가의 가장 큰 문제점', makeRadioGroup('q11', [
                { v: '공정성', icon: '⚖️', t: '학교 간 평가 기준 차이' }, { v: '대입연계', icon: '🎓', t: '대입 반영 방법 불확실' },
                { v: '난이도', icon: '📏', t: '시험 난이도 조절 어려움' }, { v: '성적산출복잡', icon: '🔢', t: '성적 산출 방식이 복잡' },
                { v: '문제없음', icon: '✅', t: '특별한 문제 없음' }])) +
            qCard('Q12', '평가제도 개선 의견', '<textarea class="form-textarea" id="q12" placeholder="평가 방식에 대해 개선이 필요한 점을 자유롭게 적어 주세요."></textarea>');
    }

    function buildPart4Content() {
        const el = $('#part4Content'); if (!el) return;
        el.innerHTML =
            qCard('Q13', '어제의 가장 큰 장벽', makeRadioGroup('barrier', [
                { v: 'information', icon: '📡', t: '정보의 결핍 — 무엇을 해야 할지 모르겠음' },
                { v: 'time', icon: '⏳', t: '시간의 결핍 — 시간 압박 또는 무의미한 시간' },
                { v: 'opportunity', icon: '🚪', t: '기회의 결핍 — 원하는 과목/활동 불가' }]),
                '어제 하루 중 나의 성장을 가장 가로막았던 결핍은?') +
            // Info
            `<div class="glass-card"><h3 class="part3-q-title"><span class="part3-q-badge part3-q-badge--info">📡</span> Q14. 진로 정보 접근성</h3>
            <p class="part3-q-desc">(1점: 전혀 그렇지 않다 ← → 7점: 매우 그렇다)</p>
            <div class="likert-group">${makeLikert7('infoAccess1', '나는 진로에 대한 정보를 쉽게 구할 수 있다')}${makeLikert7('infoAccess2', '학교에서 제공하는 진로 정보는 실질적으로 도움이 된다')}${makeLikert7('infoAccess3', '진로 정보가 부족해서 불안감을 느낀 적이 있다')}</div></div>` +
            qCard('📡 Q15', '주요 진로 정보원 (복수 응답)', makeCheckboxGroup('infoSource',
                ['교과선생님', '담임선생님', '진로상담교사', '부모님/보호자', '친구·선후배', '유튜브/SNS', 'AI(ChatGPT등)', '커리어넷등 공공사이트', '학원/사교육', '기타'])) +
            qCard('📡 Q16', '정보 사막 체감', '<textarea class="form-textarea" id="infoDesertExperience" placeholder="진로 정보를 찾으려고 했지만 구하기 어려웠던 경험이 있다면 적어 주세요." rows="3"></textarea>') +
            // Time
            `<div class="glass-card"><h3 class="part3-q-title"><span class="part3-q-badge part3-q-badge--time">⏳</span> Q17. 시간 활용도</h3>
            <p class="part3-q-desc">(1점: 전혀 그렇지 않다 ← → 7점: 매우 그렇다)</p>
            <div class="likert-group">${makeLikert7('timeUse1', '나는 하루 일과를 스스로 계획하고 주도적으로 운영하고 있다')}${makeLikert7('timeUse2', '입시/성적 경쟁 때문에 시간의 압박감을 자주 느낀다')}${makeLikert7('timeUse3', '의미 없이 흘려 보내는 시간이 많다고 느낀다')}${makeLikert7('timeUse4', '어제 하루 중 무언가에 완전히 몰입(Flow)한 경험이 있다')}</div></div>` +
            qCard('⏳ Q18', '시간 설계 제안', '<textarea class="form-textarea" id="timeDesignSuggestion" placeholder="만약 어제의 시간표를 다시 설계할 수 있다면, 어떤 시간을 바꾸고 싶은가요?" rows="3"></textarea>') +
            // Opportunity
            `<div class="glass-card"><h3 class="part3-q-title"><span class="part3-q-badge part3-q-badge--opp">🚪</span> Q19. 기회 인식</h3>
            <p class="part3-q-desc">(1점: 전혀 그렇지 않다 ← → 7점: 매우 그렇다)</p>
            <div class="likert-group">${makeLikert7('oppAccess1', '우리 학교에서는 내가 원하는 과목/수업을 자유롭게 선택할 수 있다')}${makeLikert7('oppAccess2', '진로 변경을 원할 때, 학교가 이를 유연하게 지원해 준다')}${makeLikert7('oppAccess3', '우리 지역에는 진로 탐색을 위한 교육 인프라가 충분하다')}${makeLikert7('oppAccess4', '성적이 아닌 나의 관심·적성 중심으로 진로를 결정할 수 있다고 느낀다')}</div></div>` +
            qCard('🚪 Q20', '기회 구조 개선', '<textarea class="form-textarea" id="oppImproveSuggestion" placeholder="학교에서 새로운 기회(과목·활동·경험)를 준다면, 가장 하고 싶은 것은?" rows="3"></textarea>');
        // Setup barrier click handlers
        setupBarrierOptions();
    }

    function buildPart5Content() {
        const el = $('#part5Content'); if (!el) return;
        el.innerHTML =
            qCard('🌱 Q21', '자기 성장 실감', '<div class="likert-item">' + makeLikert('q21', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '고교학점제를 통해 내가 성장하고 있다고 느낀다.') +
            qCard('💪 Q22', '자기결정감 (자율성)', '<div class="likert-item">' + makeLikert('q22', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '나는 학교생활에서 스스로 선택하고 결정할 수 있는 기회가 충분하다.') +
            qCard('🔥 Q23', '몰입 경험', '<div class="likert-item">' + makeLikert('q23', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '선택한 과목을 공부하면서 시간 가는 줄 모르고 몰입한 경험이 있다.') +
            qCard('🤝 Q24', '관계 및 소속감', '<div class="likert-item">' + makeLikert('q24', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '고교학점제 수업에서 선생님·친구와의 관계가 나의 학습에 긍정적 영향을 준다.') +
            qCard('✨ Q25', '삶의 목적 및 의미', '<div class="likert-item">' + makeLikert('q25', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '학교에서의 배움이 나의 미래와 삶의 방향을 찾는 데 의미가 있다고 느낀다.') +
            `<div class="glass-card"><h3 class="part3-q-title"><span class="part3-q-badge part3-q-badge--well">💚</span> Q26. 전반적 웰빙 자가 진단</h3>
            <p class="part3-q-desc">어제 하루 전체를 떠올렸을 때, 다음 감정을 얼마나 느꼈나요?<br><span class="part3-scale-hint">(1점: 전혀 아님 ← → 7점: 매우 그렇다)</span></p>
            <div class="likert-group">${makeLikert7('wb_happy', '😊 즐거움/행복감')}${makeLikert7('wb_confident', '💪 자신감/자기효능감')}${makeLikert7('wb_growth', '🌱 성장하고 있다는 느낌')}${makeLikert7('wb_anxious', '😰 불안감/초조함')}${makeLikert7('wb_bored', '😴 지루함/무기력함')}${makeLikert7('wb_depressed', '😞 우울함/슬픔')}</div></div>` +
            qCard('Q27', '전반적 만족도', '<div class="likert-item">' + makeLikert('q27', 5, '1점: 전혀 아님 ← → 5점: 매우 그렇다') + '</div>',
                '전반적으로, 고교학점제에 만족한다.') +
            qCard('✨ Q28', '나의 이상적인 하루', '<textarea class="form-textarea" id="idealDay" placeholder="어제의 실제 하루와 비교했을 때, 나에게 이상적인 하루는 어떤 모습인가요?" rows="3"></textarea>') +
            qCard('📝 Q29', '자유 의견', '<textarea class="form-textarea" id="freeComment" placeholder="고교학점제에 대해 하고 싶은 말이 있다면 자유롭게 적어 주세요." rows="3"></textarea>');
    }

    function buildPart6Content() {
        const el = $('#part6Content'); if (!el) return;
        el.innerHTML =
            '<div class="glass-card"><h3 class="part3-q-title">학년</h3>' + makeRadioGroup('grade', [
                { v: '1', icon: '1', t: '1학년' }, { v: '2', icon: '2', t: '2학년' }, { v: '3', icon: '3', t: '3학년' }]) + '</div>' +
            '<div class="glass-card"><h3 class="part3-q-title">학교 유형</h3>' + makeRadioGroup('schoolType', [
                { v: '일반고', icon: '🏫', t: '일반고' }, { v: '특목고', icon: '🎯', t: '특목고 (외고/과고/국제고)' },
                { v: '자율고', icon: '📘', t: '자율고 (자사고/자공고)' }, { v: '특성화고', icon: '🔧', t: '특성화고' }]) + '</div>' +
            `<div class="glass-card"><h3 class="part3-q-title">지역 (시·도)</h3>
            <select class="form-input" id="region" style="padding:0.8rem;"><option value="">선택해 주세요</option>
            <option value="서울">서울특별시</option><option value="부산">부산광역시</option><option value="대구">대구광역시</option>
            <option value="인천">인천광역시</option><option value="광주">광주광역시</option><option value="대전">대전광역시</option>
            <option value="울산">울산광역시</option><option value="세종">세종특별자치시</option><option value="경기">경기도</option>
            <option value="강원">강원특별자치도</option><option value="충북">충청북도</option><option value="충남">충청남도</option>
            <option value="전북">전북특별자치도</option><option value="전남">전라남도</option><option value="경북">경상북도</option>
            <option value="경남">경상남도</option><option value="제주">제주특별자치도</option></select></div>` +
            '<div class="glass-card"><h3 class="part3-q-title">과목 선택 경험 여부</h3>' + makeRadioGroup('hasSelected', [
                { v: 'yes', icon: '✅', t: '예, 선택한 경험이 있습니다' }, { v: 'no', icon: '❌', t: '아니요, 아직 없습니다' }]) + '</div>';
    }

    function setupBarrierOptions() {
        $$('.barrier-option').forEach((opt) => {
            opt.addEventListener('click', () => {
                const parent = opt.closest('.barrier-options');
                parent.querySelectorAll('.barrier-option').forEach((o) => o.classList.remove('selected'));
                opt.classList.add('selected');
                const inp = opt.querySelector('input');
                if (inp) {
                    inp.checked = true;
                    if (inp.name === 'barrier') {
                        state.barrier = inp.value;
                        saveState();
                    }
                }
            });
        });
    }

    // ──────────────── Export ────────────────
    function collectAllData() {
        function getLikertValue(name) {
            const el = document.querySelector(`input[name="${name}"]:checked`);
            return el ? parseInt(el.value) : null;
        }
        function getRadioValue(name) {
            const el = document.querySelector(`input[name="${name}"]:checked`);
            return el ? el.value : null;
        }

        // Collect info sources (checkboxes)
        const infoSources = [...document.querySelectorAll('input[name="infoSource"]:checked')]
            .map(cb => cb.value);

        return {
            timestamp: new Date().toISOString(),
            phoneNumber: $('#phoneNumber')?.value || '',
            episodes: state.episodes.map((ep) => ({
                id: ep.id,
                startTime: ep.startTime,
                endTime: ep.endTime,
                activity: ep.activity,
                location: ep.location,
                companion: ep.companion,
            })),
            selectedEpisodeIds: state.selectedEpisodeIds,
            diagnoses: Object.entries(state.diagnoses).map(([epId, d]) => {
                const ep = state.episodes.find((e) => e.id === parseInt(epId));
                return {
                    episodeId: parseInt(epId),
                    activity: ep?.activity || '',
                    information: d.information,
                    informationSources: d.informationSources || [],
                    informationSourceEtc: d.informationSourceEtc || '',
                    time: d.time,
                    opportunityChosen: d.opportunityChosen,
                    opportunityFlexible: d.opportunityFlexible,
                    eudaimonia_growth: d.eudaimonia.growth,
                    eudaimonia_autonomy: d.eudaimonia.autonomy,
                    eudaimonia_flow: d.eudaimonia.flow,
                    eudaimonia_belonging: d.eudaimonia.belonging,
                    eudaimonia_meaning: d.eudaimonia.meaning,
                };
            }),
            // Part 3: HCCS Curriculum + Assessment
            hccs: {
                q1: getLikertValue('q1') || getRadioValue('q1'),
                q2: getLikertValue('q2'), q3: getLikertValue('q3'), q4: getLikertValue('q4'),
                q5: [...document.querySelectorAll('input[name="q5"]:checked')].map(c => c.value),
                q6: $('#q6')?.value || '',
                q7: getLikertValue('q7'), q8: getLikertValue('q8'), q9: getLikertValue('q9'), q10: getLikertValue('q10'),
                q11: getRadioValue('q11'),
                q12: $('#q12')?.value || '',
            },
            // Part 4: Info/Time/Opportunity
            globalReflection: {
                biggestBarrier: state.barrier,
                infoAccess1: getLikertValue('infoAccess1'),
                infoAccess2: getLikertValue('infoAccess2'),
                infoAccess3: getLikertValue('infoAccess3'),
                infoSources: infoSources,
                infoDesertExperience: $('#infoDesertExperience')?.value || '',
                timeUse1: getLikertValue('timeUse1'),
                timeUse2: getLikertValue('timeUse2'),
                timeUse3: getLikertValue('timeUse3'),
                timeUse4: getLikertValue('timeUse4'),
                timeDesignSuggestion: $('#timeDesignSuggestion')?.value || '',
                oppAccess1: getLikertValue('oppAccess1'),
                oppAccess2: getLikertValue('oppAccess2'),
                oppAccess3: getLikertValue('oppAccess3'),
                oppAccess4: getLikertValue('oppAccess4'),
                oppImproveSuggestion: $('#oppImproveSuggestion')?.value || '',
            },
            // Part 5: Wellbeing
            wellbeing: {
                q21: getLikertValue('q21'), q22: getLikertValue('q22'), q23: getLikertValue('q23'),
                q24: getLikertValue('q24'), q25: getLikertValue('q25'),
                wb_happy: getLikertValue('wb_happy'), wb_confident: getLikertValue('wb_confident'),
                wb_growth: getLikertValue('wb_growth'), wb_anxious: getLikertValue('wb_anxious'),
                wb_bored: getLikertValue('wb_bored'), wb_depressed: getLikertValue('wb_depressed'),
                q27: getLikertValue('q27'),
                idealDay: $('#idealDay')?.value || '',
                freeComment: $('#freeComment')?.value || '',
            },
            // Part 6: Basic Info
            basicInfo: {
                grade: getRadioValue('grade'),
                schoolType: getRadioValue('schoolType'),
                region: $('#region')?.value || '',
                hasSelected: getRadioValue('hasSelected'),
            },
        };
    }

    function exportJSON() {
        const data = collectAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `DRM_응답_${formatDateForFile()}.json`);
        showToast('JSON 파일이 다운로드되었습니다!');
    }

    function exportCSV() {
        const data = collectAllData();
        const ts = data.timestamp;

        // Episodes sheet
        let csv = 'sep=,\n';
        csv += '=== 에피소드 목록 ===\n';
        csv += '번호,시작시간,종료시간,활동내용,장소,동행인\n';
        data.episodes.forEach((ep, i) => {
            csv += `${i + 1},${ep.startTime},${ep.endTime},"${ep.activity}","${ep.location}","${ep.companion}"\n`;
        });

        csv += '\n=== 심층 진단 ===\n';
        csv += '에피소드,활동,정보,정보원,시간,기회_선택,기회_유연,즐거움,자신감,불안함,지루함\n';
        data.diagnoses.forEach((d) => {
            csv += `${d.episodeId},"${d.activity}",${d.information || ''},"${d.informationSource}",${d.time || ''},${d.opportunityChosen || ''},${d.opportunityFlexible || ''},${d.wellbeing_joy},${d.wellbeing_confidence},${d.wellbeing_anxiety},${d.wellbeing_boredom}\n`;
        });

        csv += '\n=== 종합 진단 ===\n';
        csv += `가장 큰 장벽,${data.globalReflection.biggestBarrier || ''}\n`;
        csv += `학교에 바라는 한 마디,"${data.globalReflection.schoolMessage || ''}"\n`;
        csv += `응답 시각,${ts}\n`;

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `DRM_응답_${formatDateForFile()}.csv`);
        showToast('CSV 파일이 다운로드되었습니다!');
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    // ──────────────── Submit to Backend ────────────────
    async function submitToBackend(data) {
        const statusEl = $('#submitStatus');
        const textEl = statusEl?.querySelector('.submit-status__text');

        // Check if endpoint is configured
        if (typeof DRM_CONFIG === 'undefined' || !DRM_CONFIG.GAS_ENDPOINT) {
            if (statusEl) {
                statusEl.className = 'submit-status submit-status--info';
                if (textEl) textEl.textContent = '⚠️ 백엔드 미설정 — 로컬에 저장되었습니다.';
            }
            saveResponseLocally(data);
            return;
        }

        if (statusEl) {
            statusEl.style.display = 'flex';
            statusEl.className = 'submit-status submit-status--loading';
            if (textEl) textEl.textContent = '응답을 제출하고 있습니다...';
        }

        let retries = DRM_CONFIG.RETRY_COUNT || 2;
        let success = false;

        while (retries >= 0 && !success) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), DRM_CONFIG.SUBMIT_TIMEOUT_MS || 15000);

                // Google Apps Script redirects on POST, so we use no-cors mode.
                // The data IS sent and processed by GAS, but we get an opaque response.
                await fetch(DRM_CONFIG.GAS_ENDPOINT, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    mode: 'no-cors',
                    redirect: 'follow',
                    signal: controller.signal,
                });
                clearTimeout(timeout);

                // If fetch didn't throw, data was sent successfully
                success = true;
                if (statusEl) {
                    statusEl.className = 'submit-status submit-status--success';
                    if (textEl) textEl.textContent = '✅ 응답이 성공적으로 제출되었습니다!';
                }
                showToast('응답이 제출되었습니다!');

            } catch (err) {
                retries--;
                if (retries < 0) {
                    if (statusEl) {
                        statusEl.className = 'submit-status submit-status--error';
                        if (textEl) textEl.textContent = '❌ 제출 실패 — 로컬에 저장되었습니다. 나중에 다시 시도해 주세요.';
                    }
                    showToast('제출 실패. 로컬에 저장되었습니다.', 'error');
                    saveResponseLocally(data);
                }
            }
        }
    }

    function saveResponseLocally(data) {
        try {
            const existing = JSON.parse(localStorage.getItem('drm_submitted_responses') || '[]');
            existing.push({
                ...data,
                respondentId: 'local_' + Date.now(),
                submittedAt: new Date().toISOString(),
            });
            localStorage.setItem('drm_submitted_responses', JSON.stringify(existing));
        } catch (e) { /* ignore */ }
    }

    // ──────────────── Local Storage ────────────────
    function saveState() {
        try {
            localStorage.setItem('hccsdrm_state', JSON.stringify({
                episodes: state.episodes,
                selectedEpisodeIds: state.selectedEpisodeIds,
                diagnoses: state.diagnoses,
                barrier: state.barrier,
                currentPart: state.currentPart,
                episodeIdCounter,
            }));
        } catch (e) { /* ignore */ }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem('hccsdrm_state');
            if (!raw) return false;
            const saved = JSON.parse(raw);
            if (saved.episodes?.length) {
                episodeIdCounter = saved.episodeIdCounter || 0;
                saved.episodes.forEach((ep) => {
                    state.episodes.push(ep);
                    renderEpisodeCard(ep);
                });
                updateEpisodeCount();
                state.selectedEpisodeIds = saved.selectedEpisodeIds || [];
                state.diagnoses = saved.diagnoses || {};
                state.barrier = saved.barrier || null;
                // Restore barrier UI
                if (state.barrier) {
                    const opt = $(`.barrier-option[data-value="${state.barrier}"]`);
                    if (opt) {
                        opt.classList.add('selected');
                        opt.querySelector('input').checked = true;
                    }
                }
                return true;
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    // ──────────────── Helpers ────────────────
    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatTime(t) {
        if (!t) return '--:--';
        return t;
    }

    function formatDateForFile() {
        const d = new Date();
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    }

    // ──────────────── Validation ────────────────
    function validatePart1() {
        const filled = state.episodes.filter((ep) => ep.activity.trim());
        if (filled.length < 3) {
            showToast('최소 3개 이상의 에피소드를 작성해 주세요.', 'error');
            return false;
        }
        return true;
    }

    function validatePart2Selection() {
        if (state.selectedEpisodeIds.length < 3) {
            showToast('3개 이상의 에피소드를 선택해 주세요.', 'error');
            return false;
        }
        return true;
    }

    // ──────────────── Init ────────────────
    function init() {
        const loaded = loadState();

        // 경기도 고등학교 일과 기본 템플릿 (10개 에피소드)
        if (!loaded) {
            createEpisode({ startTime: '08:20', endTime: '08:50', activity: '등교 및 조례', location: '학교 교실', companion: '담임선생님, 반 친구들' });
            createEpisode({ startTime: '09:00', endTime: '09:50', activity: '1교시 수업', location: '학교 교실', companion: '교과선생님, 반 친구들' });
            createEpisode({ startTime: '10:00', endTime: '10:50', activity: '2교시 수업', location: '학교 교실', companion: '교과선생님, 반 친구들' });
            createEpisode({ startTime: '11:00', endTime: '11:50', activity: '3교시 수업', location: '학교 교실', companion: '교과선생님, 반 친구들' });
            createEpisode({ startTime: '12:00', endTime: '12:50', activity: '4교시 수업', location: '학교 교실', companion: '교과선생님, 반 친구들' });
            createEpisode({ startTime: '12:50', endTime: '13:40', activity: '점심시간', location: '급식실 / 교실', companion: '친구들' });
            createEpisode({ startTime: '13:40', endTime: '15:20', activity: '5~6교시 수업', location: '학교 교실', companion: '교과선생님, 반 친구들' });
            createEpisode({ startTime: '15:30', endTime: '16:30', activity: '7교시 수업', location: '학교 교실', companion: '교과선생님, 반 친구들' });
            createEpisode({ startTime: '16:30', endTime: '18:00', activity: '방과 후 활동 / 자율학습', location: '학교 / 학원', companion: '친구들, 선생님' });
            createEpisode({ startTime: '18:00', endTime: '19:00', activity: '귀가 및 저녁식사', location: '집', companion: '가족' });
        }

        // Hide progress bar on intro screen (default view)
        if (state.currentPart === 'intro') {
            $('#progressBar').style.display = 'none';
        }

        // ---- Button handlers ----

        // Intro → Part 1 (phone required)
        const startSurveyBtn = $('#startSurveyBtn');
        if (startSurveyBtn) {
            startSurveyBtn.addEventListener('click', () => {
                const phone = $('#phoneNumber')?.value?.trim();
                if (!phone) {
                    showToast('사례비 지급을 위해 핸드폰 번호를 입력해 주세요.', 'error');
                    $('#phoneNumber')?.focus();
                    return;
                }
                goToPart(1);
            });
        }

        addEpisodeBtn.addEventListener('click', () => {
            const last = state.episodes[state.episodes.length - 1];
            createEpisode({ startTime: last?.endTime || '', endTime: '', activity: '', location: '', companion: '' });
            // scroll to new card
            setTimeout(() => {
                episodeList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        });

        const toPart2Btn = $('#toPart2Btn');
        toPart2Btn.addEventListener('click', () => {
            syncEpisodeInputs();
            if (!validatePart1()) return;
            populateEpisodeSelection();
            goToPart(2);
        });

        const backToPart1Btn = $('#backToPart1Btn');
        if (backToPart1Btn) backToPart1Btn.addEventListener('click', () => goToPart(1));

        startDiagnosisBtn.addEventListener('click', () => {
            if (!validatePart2Selection()) return;
            buildDiagnosisForms();
            $('#part2Selection').style.display = 'none';
            $('#part2Diagnosis').style.display = 'block';
        });

        toPart3Btn.addEventListener('click', () => {
            syncDiagnosisInputs();
            buildPart3Content();
            setupBarrierOptions();
            goToPart(3);
        });

        const backToPart2Btn = $('#backToPart2Btn2');
        if (backToPart2Btn) backToPart2Btn.addEventListener('click', () => {
            $('#part2Selection').style.display = 'block';
            $('#part2Diagnosis').style.display = 'none';
            goToPart(2);
        });

        // Part 3 → 4
        const toPart4Btn = $('#toPart4Btn');
        if (toPart4Btn) toPart4Btn.addEventListener('click', () => { buildPart4Content(); setupBarrierOptions(); goToPart(4); });
        const backToPart3Btn = $('#backToPart3Btn');
        if (backToPart3Btn) backToPart3Btn.addEventListener('click', () => goToPart(3));

        // Part 4 → 5
        const toPart5Btn = $('#toPart5Btn');
        if (toPart5Btn) toPart5Btn.addEventListener('click', () => { buildPart5Content(); goToPart(5); });
        const backToPart4Btn = $('#backToPart4Btn');
        if (backToPart4Btn) backToPart4Btn.addEventListener('click', () => goToPart(4));

        // Part 5 → 6
        const toPart6Btn = $('#toPart6Btn');
        if (toPart6Btn) toPart6Btn.addEventListener('click', () => { buildPart6Content(); setupBarrierOptions(); goToPart(6); });
        const backToPart5Btn = $('#backToPart5Btn');
        if (backToPart5Btn) backToPart5Btn.addEventListener('click', () => goToPart(5));

        completeBtn.addEventListener('click', async () => {
            saveState();
            goToPart('done');
            const data = collectAllData();
            await submitToBackend(data);
        });

        // Barrier options — will be set up when Part 4 is built



        // Progress step click navigation
        $$('.progress-step__circle').forEach((circle) => {
            circle.addEventListener('click', () => {
                const stepEl = circle.closest('.progress-step');
                const step = parseInt(stepEl?.dataset.step);
                if (!isNaN(step) && step >= 1 && step <= TOTAL_PARTS) {
                    goToPart(step);
                }
            });
        });
    }

    function syncEpisodeInputs() {
        episodeList.querySelectorAll('.episode-card').forEach((card) => {
            const id = parseInt(card.dataset.id);
            const ep = state.episodes.find((e) => e.id === id);
            if (!ep) return;
            ep.startTime = card.querySelector('.ep-start')?.value || '';
            ep.endTime = card.querySelector('.ep-end')?.value || '';
            ep.activity = card.querySelector('.ep-activity')?.value || '';
            ep.location = card.querySelector('.ep-location')?.value || '';
            ep.companion = card.querySelector('.ep-companion')?.value || '';
        });
        saveState();
    }

    function syncDiagnosisInputs() {
        diagnosisForms.querySelectorAll('.radio-group').forEach((rg) => {
            const field = rg.dataset.field;
            const epId = parseInt(rg.dataset.ep);
            const checked = rg.querySelector('input:checked');
            if (checked && state.diagnoses[epId]) {
                state.diagnoses[epId][field] = checked.value;
            }
        });
        diagnosisForms.querySelectorAll('.info-source').forEach((input) => {
            const epId = parseInt(input.dataset.ep);
            if (state.diagnoses[epId]) {
                state.diagnoses[epId].informationSource = input.value;
            }
        });
        diagnosisForms.querySelectorAll('input[type="range"]').forEach((slider) => {
            const epId = parseInt(slider.dataset.ep);
            const dim = slider.dataset.dim;
            if (state.diagnoses[epId]) {
                state.diagnoses[epId].eudaimonia[dim] = parseInt(slider.value);
            }
        });
        saveState();
    }

    // Boot
    document.addEventListener('DOMContentLoaded', init);
})();
