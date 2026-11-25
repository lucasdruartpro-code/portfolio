// Connexion à l'administration (Decap CMS) sur Cloudflare Pages : étape 2
// GitHub revient ici avec un code. On l'échange contre un jeton, puis on le transmet
// à la fenêtre de l'administration qui a ouvert la connexion (le format attendu par Decap).

function page(statut, contenu) {
    const message = `authorization:github:${statut}:${JSON.stringify(contenu)}`;
    const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Connexion</title><body><p>Connexion en cours…</p>
<script>
(function () {
    var message = ${JSON.stringify(message)};
    // Seul le site lui-même peut recevoir le jeton
    function recevoir(e) {
        if (e.origin !== window.location.origin) return;
        window.opener.postMessage(message, e.origin);
        window.removeEventListener("message", recevoir);
    }
    window.addEventListener("message", recevoir);
    window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`;
    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Set-Cookie": "decap_etat=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
        },
    });
}

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const etat = url.searchParams.get("state");
    const cookie = request.headers.get("Cookie") || "";
    const etatAttendu = (cookie.match(/(?:^|;\s*)decap_etat=([^;]+)/) || [])[1];

    if (!code || !etat || etat !== etatAttendu) {
        return page("error", { message: "Demande de connexion invalide ou expirée. Réessaie." });
    }

    const reponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "portfolio-admin" },
        body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: `${url.origin}/api/callback`,
        }),
    });
    const donnees = await reponse.json().catch(() => ({}));

    if (!donnees.access_token) {
        return page("error", { message: donnees.error_description || "GitHub a refusé la connexion." });
    }
    return page("success", { token: donnees.access_token, provider: "github" });
}
