/* ======================================================
   DRM Survey — Application Logic
   Episode management, diagnosis, export
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

    const toPart2Btn = $('#toPart2Btn');
    const backToPart1Btn = $('#backToPart1Btn');
    const toPart3Btn = $('#toPart3Btn');
    const backToPart2Btn = $('#backToPart2Btn');
    const completeBtn = $('#completeBtn');

    const episodeSelectGrid = $('#episodeSelectGrid');
    const selectedCountText = $('#selectedCountText');
    const selectedCountBadge = $('#selectedCountBadge');
    const startDiagnosisBtn = $('#startDiagnosisBtn');
    const diagnosisForms = $('#diagnosisForms');

    const exportJsonBtn = $('#exportJsonBtn');
    const exportCsvBtn = $('#exportCsvBtn');

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
            updateProgressSteps(4);
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
                wellbeing: { joy: 4, confidence: 4, anxiety: 4, boredom: 4 },
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

        <!-- 4. Well-being -->
        <div class="diagnosis-section-divider">
          <div class="diagnosis-section-divider__line"></div>
          <span class="diagnosis-section-divider__label">💜 웰빙 (Well-being)</span>
          <div class="diagnosis-section-divider__line"></div>
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">
          이 활동 중 느꼈던 감정의 점수를 매겨 주세요. (1점: 전혀 아님 ~ 7점: 매우 그렇다)
        </p>

        ${buildSlider(id, 'joy', '😊 즐거움')}
        ${buildSlider(id, 'confidence', '💪 자신감')}
        ${buildSlider(id, 'anxiety', '😰 불안함')}
        ${buildSlider(id, 'boredom', '😑 지루함')}
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
                        state.diagnoses[epId].wellbeing[dim] = val;
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

    // ──────────────── Part 3 ────────────────
    function updateSummaryDashboard() {
        $('#statEpisodes').textContent = state.episodes.length;
        $('#statDiagnosed').textContent = state.selectedEpisodeIds.length;

        // Average wellbeing (average of positive minus negative)
        const diags = Object.values(state.diagnoses);
        if (diags.length > 0) {
            let total = 0;
            let count = 0;
            diags.forEach((d) => {
                const w = d.wellbeing;
                const pos = (w.joy + w.confidence) / 2;
                const neg = (w.anxiety + w.boredom) / 2;
                total += pos - neg;
                count++;
            });
            const avg = total / count;
            $('#statAvgWellbeing').textContent = avg >= 0 ? `+${avg.toFixed(1)}` : avg.toFixed(1);
        }
    }

    function setupBarrierOptions() {
        $$('.barrier-option').forEach((opt) => {
            opt.addEventListener('click', () => {
                $$('.barrier-option').forEach((o) => o.classList.remove('selected'));
                opt.classList.add('selected');
                state.barrier = opt.querySelector('input').value;
                saveState();
            });
        });
    }

    // ──────────────── Export ────────────────
    function collectAllData() {
        // Helper: collect all radio values with a given name prefix
        function getLikertValue(name) {
            const el = document.querySelector(`input[name="${name}"]:checked`);
            return el ? parseInt(el.value) : null;
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
                    wellbeing_joy: d.wellbeing.joy,
                    wellbeing_confidence: d.wellbeing.confidence,
                    wellbeing_anxiety: d.wellbeing.anxiety,
                    wellbeing_boredom: d.wellbeing.boredom,
                };
            }),
            globalReflection: {
                // Q1
                biggestBarrier: state.barrier,
                // Q2: 정보 접근성 (Likert)
                infoAccess1: getLikertValue('infoAccess1'),
                infoAccess2: getLikertValue('infoAccess2'),
                infoAccess3: getLikertValue('infoAccess3'),
                // Q3: 정보원 (checkboxes)
                infoSources: infoSources,
                // Q4: 정보 사막 (open-ended)
                infoDesertExperience: $('#infoDesertExperience')?.value || '',
                // Q5: 시간 활용도 (Likert)
                timeUse1: getLikertValue('timeUse1'),
                timeUse2: getLikertValue('timeUse2'),
                timeUse3: getLikertValue('timeUse3'),
                timeUse4: getLikertValue('timeUse4'),
                // Q6: 시간 설계 제안 (open-ended)
                timeDesignSuggestion: $('#timeDesignSuggestion')?.value || '',
                // Q7: 기회 인식 (Likert)
                oppAccess1: getLikertValue('oppAccess1'),
                oppAccess2: getLikertValue('oppAccess2'),
                oppAccess3: getLikertValue('oppAccess3'),
                oppAccess4: getLikertValue('oppAccess4'),
                // Q8: 기회 구조 개선 (open-ended)
                oppImproveSuggestion: $('#oppImproveSuggestion')?.value || '',
                // Q9: 웰빙 자가 진단 (Likert)
                wb_happy: getLikertValue('wb_happy'),
                wb_confident: getLikertValue('wb_confident'),
                wb_growth: getLikertValue('wb_growth'),
                wb_anxious: getLikertValue('wb_anxious'),
                wb_bored: getLikertValue('wb_bored'),
                wb_depressed: getLikertValue('wb_depressed'),
                // Q10: 이상적인 하루 (open-ended)
                idealDay: $('#idealDay')?.value || '',
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
            localStorage.setItem('drm_state', JSON.stringify({
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
            const raw = localStorage.getItem('drm_state');
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

        // Intro → Part 1
        const startSurveyBtn = $('#startSurveyBtn');
        if (startSurveyBtn) {
            startSurveyBtn.addEventListener('click', () => goToPart(1));
        }

        addEpisodeBtn.addEventListener('click', () => {
            const last = state.episodes[state.episodes.length - 1];
            createEpisode({ startTime: last?.endTime || '', endTime: '', activity: '', location: '', companion: '' });
            // scroll to new card
            setTimeout(() => {
                episodeList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        });

        toPart2Btn.addEventListener('click', () => {
            // Sync episode data from inputs first
            syncEpisodeInputs();
            if (!validatePart1()) return;
            populateEpisodeSelection();
            goToPart(2);
        });

        backToPart1Btn.addEventListener('click', () => goToPart(1));

        startDiagnosisBtn.addEventListener('click', () => {
            if (!validatePart2Selection()) return;
            buildDiagnosisForms();
            $('#part2Selection').style.display = 'none';
            $('#part2Diagnosis').style.display = 'block';
        });

        toPart3Btn.addEventListener('click', () => {
            // Sync diagnosis data
            syncDiagnosisInputs();
            updateSummaryDashboard();
            goToPart(3);
        });

        backToPart2Btn.addEventListener('click', () => {
            $('#part2Selection').style.display = 'block';
            $('#part2Diagnosis').style.display = 'none';
            goToPart(2);
        });

        completeBtn.addEventListener('click', async () => {
            saveState();
            goToPart('done');

            // Submit to Google Apps Script
            const data = collectAllData();
            await submitToBackend(data);
        });

        exportJsonBtn.addEventListener('click', exportJSON);
        exportCsvBtn.addEventListener('click', exportCSV);

        // Barrier options
        setupBarrierOptions();



        // Progress step click navigation
        $$('.progress-step__circle').forEach((circle) => {
            circle.addEventListener('click', () => {
                const stepEl = circle.closest('.progress-step');
                const step = parseInt(stepEl?.dataset.step);
                if (!isNaN(step) && step >= 1 && step <= 3) {
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
                state.diagnoses[epId].wellbeing[dim] = parseInt(slider.value);
            }
        });
        saveState();
    }

    // Boot
    document.addEventListener('DOMContentLoaded', init);
})();
