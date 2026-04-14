/* ============================================
   TEAM MUSICSCAPE — Main JS
   ============================================ */

// ── 1. Navbar 스크롤 시 배경 추가 ──────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('bg', window.scrollY > 50);
});

// ── 2. 오른쪽 슬라이드 메뉴 ─────────────────────
const hamburger    = document.getElementById('hamburger');
const sideMenu     = document.getElementById('sideMenu');
const sideClose    = document.getElementById('sideClose');
const sideBackdrop = document.getElementById('sideBackdrop');

function openMenu() {
    sideMenu.classList.add('open');
    sideBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeMenu() {
    sideMenu.classList.remove('open');
    sideBackdrop.classList.remove('open');
    document.body.style.overflow = '';
}
hamburger.addEventListener('click', openMenu);
sideClose.addEventListener('click', closeMenu);
sideBackdrop.addEventListener('click', closeMenu);
document.querySelectorAll('.sl-link').forEach(l => l.addEventListener('click', closeMenu));

// ── 3. 언어 버튼 (활성 표시) ────────────────────
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // 나중에 번역 페이지로 이동하는 로직 추가 예정
        // const lang = btn.dataset.lang;
        // window.location.href = `/${lang}/index.html`;
    });
});


// ── 3. Hero 슬라이드쇼 + YouTube IFrame API ────────────────
const slides      = document.querySelectorAll('.slide');
const dots        = document.querySelectorAll('.dot');
const viewWorkBtn = document.getElementById('viewWorkBtn');
const soundBtn    = document.getElementById('soundBtn');
let current   = 0;
let autoTimer = null;
let isMuted   = true;
const ytPlayers = {};   // { ytframe-N: YT.Player }

// YouTube IFrame API 로드 완료 → 첫 슬라이드 플레이어 생성
window.onYouTubeIframeAPIReady = function () {
    activateVideoSlide(slides[0]);
};

function activateVideoSlide(slide) {
    const div = slide.querySelector('.hero-video-frame[data-ytid]');
    if (!div) return;
    const id   = div.id;
    const ytId = div.dataset.ytid;
    // YT API 아직 로드 안 됐거나 이미 생성된 플레이어면 스킵
    if (!ytId || ytPlayers[id] || typeof YT === 'undefined' || typeof YT.Player === 'undefined') return;

    ytPlayers[id] = new YT.Player(id, {
        videoId: ytId,
        playerVars: {
            autoplay: 1, mute: 1, controls: 0,
            loop: 1, playlist: ytId,
            playsinline: 1, rel: 0, modestbranding: 1
        },
        events: {
            onReady(e) {
                e.target.playVideo();
                if (!isMuted) e.target.unMute();
                const thumb = slide.querySelector('.slide-video-thumb');
                if (thumb) setTimeout(() => { thumb.style.opacity = '0'; }, 800);
            }
        }
    });
}

function goTo(idx) {
    // 이전 슬라이드가 영상이면 일시정지
    const prevDiv = slides[current].querySelector('.hero-video-frame[data-ytid]');
    if (prevDiv && ytPlayers[prevDiv.id]) {
        try { ytPlayers[prevDiv.id].pauseVideo(); } catch(e) {}
    }

    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');

    // 다음 슬라이드가 영상이면 활성화 또는 재생
    if (slides[current].classList.contains('slide-video')) {
        const nextDiv = slides[current].querySelector('.hero-video-frame[data-ytid]');
        if (nextDiv && ytPlayers[nextDiv.id]) {
            try { ytPlayers[nextDiv.id].playVideo(); } catch(e) {}
        } else {
            activateVideoSlide(slides[current]);
        }
    }

    // View Work 버튼 표시
    if (viewWorkBtn) {
        viewWorkBtn.style.opacity = slides[current].dataset.link ? '1' : '0';
    }
}

// 사운드 토글 — YT.Player.unMute() / mute()
soundBtn.addEventListener('click', e => {
    e.stopPropagation();
    isMuted = !isMuted;
    soundBtn.textContent = isMuted ? '🔇' : '🔊';

    // 현재 슬라이드의 플레이어에 적용
    const div = slides[current].querySelector('.hero-video-frame[data-ytid]');
    if (div) {
        const player = ytPlayers[div.id];
        if (player && typeof player.mute === 'function') {
            isMuted ? player.mute() : player.unMute();
        }
    }

    // 다음 영상들에도 뮤트 상태 유지 (onReady에서 isMuted 참조)
});

// View Work 클릭
if (viewWorkBtn) {
    viewWorkBtn.addEventListener('click', e => {
        e.stopPropagation();
        const link = slides[current].dataset.link;
        if (link) window.location.href = link;
    });
}

// 슬라이드 클릭 → work 페이지 이동
document.querySelector('.slides').addEventListener('click', e => {
    if (e.target.closest('.hero-arrow, .hero-dots, #soundBtn, #viewWorkBtn')) return;
    const link = slides[current].dataset.link;
    if (link) window.location.href = link;
});

function startAuto() {
    clearTimeout(autoTimer);
    const delay = slides[current].classList.contains('slide-video') ? 60000 : 10000;
    autoTimer = setTimeout(() => { goTo(current + 1); startAuto(); }, delay);
}

document.getElementById('nextBtn').addEventListener('click', () => { goTo(current + 1); startAuto(); });
document.getElementById('prevBtn').addEventListener('click', () => { goTo(current - 1); startAuto(); });
dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.index); startAuto(); }));

let touchX = 0;
document.querySelector('.hero').addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, {passive:true});
document.querySelector('.hero').addEventListener('touchend', e => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { goTo(current + (diff > 0 ? 1 : -1)); startAuto(); }
}, {passive:true});

goTo(0);
startAuto();


// ── 4. 스크롤 Reveal 애니메이션 ────────────────
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            entry.target.style.transitionDelay = `${(i % 5) * 0.1}s`;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── 5. 부드러운 앵커 스크롤 ────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop - nav.offsetHeight, behavior: 'smooth' });
    });
});

// ── 6. Contact Form ─────────────────────────────
const form = document.getElementById('contactForm');
if (form) {
    form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = form.querySelector('.btn-send');
        btn.textContent = '감사합니다 ✦';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = '메시지 보내기'; btn.disabled = false; form.reset(); }, 3500);
    });
}
