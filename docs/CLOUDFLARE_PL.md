# Wdrożenie DevOps Compass w Cloudflare

Rekomendowany wariant to Cloudflare Workers Static Assets połączony bezpośrednio z repozytorium GitHub.

## Wybrane nazwy

- nazwa Workera: `devops-compass`
- repozytorium: `lepczynski-cloud/devops-compass`
- adres produkcyjny: `devopscompass.lepczynski.it`
- katalog z plikami statycznymi: `public`

## 1. Utwórz repozytorium GitHub

Utwórz publiczne repozytorium `devops-compass` w organizacji lub na koncie `lepczynski-cloud`, a następnie umieść w nim zawartość paczki.

Przykład:

```bash
git init
git branch -M main
git add .
git commit -m "Initial DevOps Compass release"
git remote add origin git@github.com:lepczynski-cloud/devops-compass.git
git push -u origin main
```

W ustawieniach repozytorium ustaw:

- Description: `A practical, human-curated DevOps learning path that shows what to learn now, what to verify and what can wait. Privacy-first, bilingual and fully browser-based.`
- Website: `https://devopscompass.lepczynski.it/`
- Topics: skopiuj z `docs/GITHUB_METADATA.md`
- Social preview: wgraj `public/assets/og-image.png`

## 2. Połącz repozytorium z Cloudflare

1. Zaloguj się do panelu Cloudflare.
2. Otwórz `Workers & Pages`.
3. Wybierz `Create application`.
4. Wybierz import repozytorium.
5. Połącz konto GitHub, jeśli panel o to poprosi.
6. Wskaż `lepczynski-cloud/devops-compass`.
7. Ustaw nazwę Workera na `devops-compass`.
8. Ustaw parametry buildu:

```text
Build command: npm run validate
Deploy command: npx wrangler deploy
Root directory: /
```

Plik `wrangler.jsonc` już wskazuje katalog `public`, więc nie trzeba konfigurować osobnego katalogu wynikowego.

Po pierwszym wdrożeniu Cloudflare udostępni tymczasowy adres w domenie `workers.dev`. Kolejne zmiany na branchu produkcyjnym będą wdrażane automatycznie.

## 3. Podepnij subdomenę

1. Otwórz wdrożonego Workera `devops-compass`.
2. Przejdź do `Settings`.
3. Otwórz `Domains & Routes`.
4. Kliknij `Add`.
5. Wybierz `Custom Domain`.
6. Wpisz `devopscompass.lepczynski.it`.
7. Zatwierdź.

Jeżeli domena `lepczynski.it` jest obsługiwana na tym samym koncie Cloudflare, platforma utworzy rekord DNS i certyfikat TLS.

Gdy rekord DNS `devopscompass.lepczynski.it` już istnieje, usuń go przed dodaniem Custom Domain. Istniejący CNAME lub inny rekord dla tej samej nazwy może blokować operację.

## 4. Sprawdź działanie

Po wdrożeniu sprawdź:

- przełączanie języka PL i EN,
- motyw jasny i ciemny,
- zapis postępu po odświeżeniu strony,
- eksport i import JSON,
- wygląd na telefonie,
- instalację PWA,
- brak błędów CSP i service workera w konsoli,
- pliki `/robots.txt` oraz `/sitemap.xml`.

## Alternatywa: wdrożenie z terminala

```bash
npx wrangler login
npm run validate
npx wrangler deploy
```

Po pierwszym wdrożeniu dodaj subdomenę z panelu Cloudflare.

## Aktualizacje

Przy publikowaniu nowej wersji:

1. zmień wersję w `public/assets/data.js` i `package.json`,
2. zmień nazwę cache w `public/sw.js`,
3. uruchom `npm run validate`,
4. wykonaj commit i push do `main`,
5. sprawdź wynik wdrożenia w Cloudflare.
