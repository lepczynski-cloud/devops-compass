# DevOps Compass

DevOps Compass to statyczna, dwujęzyczna aplikacja pomagająca określić, czego uczyć się teraz, co zweryfikować i co można bezpiecznie odłożyć.

Nie pokazuje początkującemu całej roadmapy. Pod spodem korzysta z pełnej mapy kompetencji, ale w interfejsie wyświetla tylko część wynikającą z punktu startowego, kierunku i zadeklarowanych umiejętności.

**Planowany adres:** `https://devopscompass.lepczynski.it/`

## Najważniejsze założenia

- pojęcia przed nazwami produktów,
- fundamenty przed Kubernetes i innymi złożonymi platformami,
- konkretne umiejętności zamiast pytania „czy znasz Linuxa?”,
- trzy aktualne priorytety zamiast ogromnej listy,
- uczciwa samoocena bez sztucznego wyniku procentowego,
- ręcznie utrzymywana kolejność i zależności,
- brak konta, backendu aplikacji, bazy danych i analityki.

Profil i postęp są zapisywane w `localStorage`. Eksport i import JSON umożliwiają utworzenie kopii i przeniesienie danych do innej przeglądarki.

## Uruchomienie lokalne

```bash
python3 -m http.server 8080 --directory public
```

Następnie otwórz `http://localhost:8080`.

## Walidacja

```bash
npm run validate
```

## Wdrożenie

Pełna instrukcja znajduje się w [docs/CLOUDFLARE_PL.md](docs/CLOUDFLARE_PL.md).

## Autor

Projekt stworzył i utrzymuje [Wojciech Lepczyński](https://lepczynski.it/), DevOps i Platform Engineer z ponad 10-letnim doświadczeniem.

## Licencja

MIT
