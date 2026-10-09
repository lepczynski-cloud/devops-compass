# DevOps Compass

DevOps Compass to statyczna, dwujęzyczna aplikacja, która zamienia punkt startowy, kierunek rozwoju i zadeklarowane umiejętności w krótki, konkretny plan nauki DevOps.

Nie pokazuje początkującemu całej roadmapy. Pod spodem korzysta z pełnej mapy kompetencji, ale w interfejsie wyświetla tylko to, co jest potrzebne teraz, co warto zweryfikować oraz co może poczekać.

**Planowany adres:** `https://devopscompass.lepczynski.it/`

## Co otrzymuje użytkownik

Każdy rekomendowany temat prowadzi do kompletnego przewodnika zawierającego:

- pierwsze konkretne działanie,
- uporządkowany plan nauki,
- pojęcia do zrozumienia,
- bezpłatne materiały wraz z uzasadnieniem wyboru,
- listę kryteriów do samodzielnej weryfikacji,
- prompt do nauki z wybranym narzędziem AI,
- wymagania wstępne i kolejny logiczny temat,
- szacowany czas pierwszego przejścia i datę przeglądu treści.

Aplikacja zawiera obecnie 81 jednostek nauki, 63 konkretne deklaracje umiejętności i 92 pozycje w ręcznie utrzymywanej bibliotece materiałów.

## Najważniejsze założenia

- pojęcia przed nazwami produktów,
- fundamenty przed Kubernetes i innymi złożonymi platformami,
- konkretne umiejętności zamiast pytania „czy znasz Linuxa?”,
- maksymalnie trzy aktualne priorytety zamiast ogromnej listy,
- konkretne działanie i sposób weryfikacji przy każdym temacie,
- uczciwa samoocena bez sztucznego wyniku procentowego,
- ręcznie utrzymywana kolejność, zależności i materiały,
- brak konta, backendu aplikacji, bazy danych i analityki.

Kolejność, zależności, materiały i notatki praktyka opracowuje [Wojciech Lepczyński](https://lepczynski.it/) na podstawie ponad 10 lat pracy z DevOps, platform engineering, chmurą, CI/CD, automatyzacją, infrastrukturą i systemami produkcyjnymi.

## Zapis postępu i prywatność

Profil i postęp są zapisywane w `localStorage` bieżącej przeglądarki. Eksport i import JSON umożliwiają utworzenie kopii oraz przeniesienie danych na inne urządzenie.

Aplikacja nie wysyła odpowiedzi ani profilu do serwera. Materiały otwierają zewnętrzne strony. Prompt AI jest kopiowany przez użytkownika i używany w wybranym przez niego narzędziu. DevOps Compass nie wysyła go do żadnego dostawcy modelu.

## Uruchomienie lokalne

```bash
python3 -m http.server 8080 --directory public
```

Następnie otwórz `http://localhost:8080`.

## Walidacja

```bash
npm run validate
```

Walidator sprawdza między innymi tłumaczenia, identyfikatory, zależności, ścieżki, materiały, adresy HTTPS, wymagane pola przewodników, pliki aplikacji oraz składnię JavaScriptu.

## Wdrożenie

Pełna instrukcja znajduje się w [docs/CLOUDFLARE_PL.md](docs/CLOUDFLARE_PL.md).

## Autor

Projekt stworzył i utrzymuje [Wojciech Lepczyński](https://lepczynski.it/), DevOps i Platform Engineer z ponad 10-letnim doświadczeniem.

## Testy

Zakres wykonanych testów funkcjonalnych znajduje się w [tests/TEST_REPORT.md](tests/TEST_REPORT.md).

## Licencja

MIT
