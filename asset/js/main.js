// ===== Réglages de base =====
const html = document.documentElement;
const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sourisPrecise = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ===== Poignées des cadres de sélection (façon Figma) =====
// 8 petits carrés : 4 coins + 4 milieux
const positions = [[0, 0], [50, 0], [100, 0], [0, 50], [100, 50], [0, 100], [50, 100], [100, 100]];

document.querySelectorAll('[data-frame]').forEach((cadre) => {
    positions.forEach(([x, y]) => {
        const poignee = document.createElement('span');
        poignee.className = 'handle';
        poignee.style.left = x + '%';
        poignee.style.top = y + '%';
        cadre.appendChild(poignee);
    });
});

// L'étiquette sous la photo affiche sa vraie taille, comme dans Figma
const canvasPhoto = document.querySelector('.hero__canvas');
const tailleCadre = document.querySelector('.frame-size');

if (canvasPhoto && tailleCadre && 'ResizeObserver' in window) {
    new ResizeObserver(([entree]) => {
        const { width, height } = entree.contentRect;
        tailleCadre.textContent = `${Math.round(width)} × ${Math.round(height)}`;
    }).observe(canvasPhoto);
}

// ===== Découpage des titres lettre par lettre =====
document.querySelectorAll('.split').forEach((bloc) => {
    // Pour les lecteurs d'écran, on garde le texte complet sur le titre
    const titre = bloc.closest('h1, h2');
    if (titre && !titre.hasAttribute('aria-label')) {
        titre.setAttribute('aria-label', titre.textContent.replace(/\s+/g, ' ').trim());
    }

    const texte = bloc.textContent.trim();
    bloc.textContent = '';
    [...texte].forEach((lettre, i) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--d', i);
        span.textContent = lettre === ' ' ? ' ' : lettre;
        bloc.appendChild(span);
    });
});

// ===== Citation : un span par mot (ils s'allument au scroll) =====
const citation = document.querySelector('.words');
const mots = [];

if (citation) {
    const motsCles = citation.dataset.keys.toLowerCase().split('|').filter(Boolean);
    const texte = citation.textContent.trim();
    citation.textContent = '';
    texte.split(' ').forEach((mot) => {
        const span = document.createElement('span');
        span.className = 'word';
        if (motsCles.some((cle) => mot.toLowerCase().includes(cle))) {
            span.classList.add('word--key');
        }
        span.textContent = mot + ' ';
        citation.appendChild(span);
        mots.push(span);
    });
}

// ===== Apparition des éléments au scroll =====
const observer = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observer.unobserve(entree.target);

        if (entree.target.classList.contains('counter')) {
            animerCompteur(entree.target);
        }
    });
}, { threshold: 0.15 });

// Petits décalages pour que les tuiles de compétences arrivent l'une après l'autre
document.querySelectorAll('.skills__grid .skill').forEach((tuile, i) => {
    tuile.style.transitionDelay = (i % 6) * 60 + 'ms';
    // On enlève le délai ensuite, sinon le survol serait lent
    tuile.addEventListener('transitionend', () => {
        tuile.style.transitionDelay = '';
    }, { once: true });
});

function lancerAnimations() {
    document.querySelectorAll('.reveal, .split, .counter').forEach((el) => observer.observe(el));
}

// ===== Écran de chargement =====
const loader = document.querySelector('.loader');
const compteur = document.querySelector('.loader__count');
let dejaVu = false;

try {
    dejaVu = sessionStorage.getItem('intro-vue') === 'oui';
    sessionStorage.setItem('intro-vue', 'oui');
} catch (e) {
    // Stockage indisponible (navigation privée…) : on rejoue simplement l'intro
}

if (mouvementReduit || dejaVu) {
    loader.remove();
    lancerAnimations();
} else {
    const duree = 1100;
    const debut = performance.now();

    function chargement(maintenant) {
        const avance = Math.min((maintenant - debut) / duree, 1);
        compteur.textContent = Math.round(avance * 100) + '%';

        if (avance < 1) {
            requestAnimationFrame(chargement);
        } else {
            loader.classList.add('is-done');
            setTimeout(lancerAnimations, 300);
            setTimeout(() => loader.remove(), 1000);
        }
    }
    requestAnimationFrame(chargement);
}

// ===== Compteurs =====
function animerCompteur(el) {
    const depart = Number(el.dataset.start || 0);
    const cible = Number(el.dataset.target);
    const duree = 1600;
    const debut = performance.now();

    function etape(maintenant) {
        const avance = Math.min((maintenant - debut) / duree, 1);
        const adouci = 1 - Math.pow(1 - avance, 3); // ralentit à la fin
        el.textContent = Math.round(depart + (cible - depart) * adouci);
        if (avance < 1) requestAnimationFrame(etape);
    }
    requestAnimationFrame(etape);
}

// ===== Texte qui s'écrit tout seul =====
const zoneTexte = document.querySelector('.typing');

if (zoneTexte) {
    const listeMots = zoneTexte.dataset.words.split('|');
    let indexMot = 0;
    let indexLettre = 0;
    let efface = false;

    function taper() {
        const mot = listeMots[indexMot];
        indexLettre += efface ? -1 : 1;
        zoneTexte.textContent = mot.slice(0, indexLettre);

        let pause = efface ? 45 : 90;

        if (!efface && indexLettre === mot.length) {
            efface = true;
            pause = 1800; // le mot reste affiché un moment
        } else if (efface && indexLettre === 0) {
            efface = false;
            indexMot = (indexMot + 1) % listeMots.length;
            pause = 300;
        }
        setTimeout(taper, pause);
    }

    if (mouvementReduit) {
        zoneTexte.textContent = listeMots[0];
    } else {
        taper();
    }
}

// ===== Tout ce qui dépend du scroll =====
const nav = document.querySelector('.nav');
const barre = document.querySelector('.progress');
const frises = document.querySelectorAll('.timeline');
let dernierScroll = 0;
let enAttente = false;

function auScroll() {
    const y = window.scrollY;
    const hauteur = window.innerHeight;
    const max = document.documentElement.scrollHeight - hauteur;

    // Barre de progression
    barre.style.scale = (max > 0 ? y / max : 0) + ' 1';

    // Navigation : fond après un peu de scroll, cachée quand on descend
    nav.classList.toggle('is-scrolled', y > 30);
    const descend = y > dernierScroll && y > 400;
    nav.classList.toggle('is-hidden', descend && !nav.classList.contains('is-open'));
    dernierScroll = y;

    // Citation : on allume les mots au fur et à mesure
    if (citation) {
        const rect = citation.getBoundingClientRect();
        const avance = (hauteur * 0.85 - rect.top) / (rect.height + hauteur * 0.25);
        const allumes = Math.round(Math.min(Math.max(avance, 0), 1) * mots.length);
        mots.forEach((mot, i) => mot.classList.toggle('is-lit', i < allumes));
    }

    // Frises : la ligne se remplit
    frises.forEach((frise) => {
        const rect = frise.getBoundingClientRect();
        const avance = (hauteur * 0.7 - rect.top) / rect.height;
        frise.style.setProperty('--fill', Math.min(Math.max(avance, 0), 1));
    });

    enAttente = false;
}

window.addEventListener('scroll', () => {
    if (!enAttente) {
        enAttente = true;
        requestAnimationFrame(auScroll);
    }
}, { passive: true });

auScroll();

// ===== Menu burger (mobile) =====
const burger = document.querySelector('.nav__burger');

burger.addEventListener('click', () => {
    const ouvert = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', ouvert);
    burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
});

document.querySelectorAll('.nav__links a').forEach((lien) => {
    lien.addEventListener('click', () => {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', false);
    });
});

// ===== Effets à la souris (ordinateur uniquement) =====
if (sourisPrecise && !mouvementReduit) {
    html.classList.add('has-cursor');

    // Curseur façon Figma avec étiquette
    const curseur = document.querySelector('.cursor');
    const etiquette = curseur.querySelector('.cursor__label');

    window.addEventListener('mousemove', (e) => {
        curseur.style.transform = `translate3d(${e.clientX - 2}px, ${e.clientY - 2}px, 0)`;
    });

    document.addEventListener('mouseover', (e) => {
        const cible = e.target.closest('a, button, [data-cursor]');
        curseur.classList.toggle('is-hover', Boolean(cible));
        etiquette.textContent = cible ? (cible.dataset.cursor || 'Clic') : 'Vous';
    });

    document.addEventListener('mouseleave', () => { curseur.style.opacity = 0; });
    document.addEventListener('mouseenter', () => { curseur.style.opacity = 1; });

    // Boutons « aimantés » qui suivent un peu la souris
    document.querySelectorAll('.magnetic').forEach((bouton) => {
        bouton.addEventListener('mousemove', (e) => {
            const rect = bouton.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            bouton.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
        });
        bouton.addEventListener('mouseleave', () => {
            bouton.style.transform = '';
        });
    });

    // La photo du hero s'incline légèrement selon la souris
    const hero = document.querySelector('.hero');
    const cadre = document.querySelector('.hero__frame');

    hero.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        cadre.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
    });

    hero.addEventListener('mouseleave', () => {
        cadre.style.transform = '';
    });
}

// ===== Filtres des compétences =====
const filtres = document.querySelectorAll('.filter');
const tuiles = document.querySelectorAll('.skill');

filtres.forEach((filtre) => {
    filtre.addEventListener('click', () => {
        filtres.forEach((f) => f.classList.remove('is-active'));
        filtre.classList.add('is-active');

        const choix = filtre.dataset.filter;
        tuiles.forEach((tuile) => {
            tuile.classList.toggle('is-hidden', choix !== 'tout' && tuile.dataset.cat !== choix);
        });
    });
});

// ===== Copier l'adresse email =====
const boutonCopie = document.querySelector('.contact__copy');

boutonCopie.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(boutonCopie.dataset.email);
        boutonCopie.textContent = 'Copié ✓';
    } catch (e) {
        boutonCopie.textContent = 'Copie impossible';
    }
    setTimeout(() => { boutonCopie.textContent = "Copier l'adresse"; }, 2000);
});

// ===== Formulaire de contact =====
// Envoi sans quitter la page : Netlify reçoit les messages (voir la balise <form> du gabarit)
const formulaire = document.querySelector('.form');
const statut = formulaire.querySelector('.form__statut');
const boutonEnvoi = formulaire.querySelector('.form__envoyer');
const texteBouton = boutonEnvoi.textContent;

formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();

    // On affiche les erreurs seulement à partir de la première tentative
    formulaire.classList.add('is-checked');
    if (!formulaire.checkValidity()) {
        formulaire.querySelector(':invalid').focus();
        return;
    }

    boutonEnvoi.disabled = true;
    boutonEnvoi.textContent = 'Envoi en cours…';
    statut.className = 'form__statut';
    statut.textContent = '';

    // Si le service ne répond pas à temps, on abandonne au lieu de rester bloqué
    const limite = new AbortController();
    const minuteur = setTimeout(() => limite.abort(), 30000);

    try {
        const reponse = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(new FormData(formulaire)),
            signal: limite.signal,
        });
        if (!reponse.ok) throw new Error(reponse.status);

        statut.classList.add('is-ok');
        statut.textContent = 'Message envoyé ✓ Je vous réponds très vite.';
        formulaire.reset();
        formulaire.classList.remove('is-checked');
    } catch (erreur) {
        statut.classList.add('is-erreur');
        statut.textContent = "L'envoi a échoué. Écrivez-moi directement à l'adresse ci-contre.";
    }

    clearTimeout(minuteur);
    boutonEnvoi.disabled = false;
    boutonEnvoi.textContent = texteBouton;
});

// ===== Footer : année et heure à Noyon =====
document.getElementById('annee').textContent = new Date().getFullYear();

const heure = document.getElementById('heure');
const formatHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

function majHeure() {
    heure.textContent = formatHeure.format(new Date());
}
majHeure();
setInterval(majHeure, 30000);
