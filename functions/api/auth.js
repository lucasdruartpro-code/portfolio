// Connexion à l'administration (Decap CMS) sur Cloudflare Pages : étape 1
// L'administration ouvre cette adresse dans une petite fenêtre, et on l'envoie vers GitHub
// pour que la personne autorise l'accès. Les clés sont dans les réglages du projet Cloudflare :
// GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET (celle-ci est secrète, elle n'est jamais dans le code).

export async function onRequestGet({ request, env }) {
    if (!env.GITHUB_CLIENT_ID) {
        return new Response("La clé GITHUB_CLIENT_ID manque dans les réglages Cloudflare.", { status: 500 });
    }

    const url = new URL(request.url);
    // Un code au hasard, vérifié au retour de GitHub, pour bloquer les fausses demandes
    const etat = crypto.randomUUID();

    const github = new URL("https://github.com/login/oauth/authorize");
    github.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
    github.searchParams.set("redirect_uri", `${url.origin}/api/callback`);
    github.searchParams.set("scope", url.searchParams.get("scope") || "repo,user");
    github.searchParams.set("state", etat);

    return new Response(null, {
        status: 302,
        headers: {
            Location: github.toString(),
            "Set-Cookie": `decap_etat=${etat}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
        },
    });
}
