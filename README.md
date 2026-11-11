# web-business

Radna web-stranica studija **3dfx visual studio**. Javni tekst je na hrvatskom. Inačica na GitHub Pages i dalje ima `noindex`.

Stranica je jednostranična, za poslovne subjekte te mala i srednja poduzeća:

- Projekti (još prazna mjesta)
- 2D dizajn, 3D vizualizacija i 3D modeliranje
- Kontakt

## Pokretanje

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm run check:ui
```

`npm run dev` otvara lokalni pregled. `npm run check:ui` treba lokalni Chrome i prolazi kroz širine 320, 390, 768, 1024 i 1440 px, izbornik i obrazac.

Naslovi koriste font Nunito, tekst Outfit. Pokretni oblici su lagani CSS oblici i stanu uz smanjenje pokreta. Obrazac i dalje ne šalje poruku.

Datoteka `.github/workflows/pages.yml` slaže `dist` za GitHub Pages na adresi `https://abernik-unin.github.io/web-business/`. Nema CNAME-a i domena 3dfx.hr se ne dira. `noindex` ostaje.

## Namjerno nedovršeno

- Telefon još nije unesen.
- Obrazac nije povezan. Provjera javlja da poruka nije poslana i ne šalje podatke.
- Nema portfelja, izjava ni tuđih imena klijenata.
- Kod za plaćanje ostaje skriven dok se ne doda `public/placanje-kod.png` i na gumbu postavi `data-kod="ukljucen"`.
- U zaglavlju stoji `noindex`, da se radna inačica ne nudi za indeksiranje. To treba ukloniti tek uz stvarnu objavu.

Domena 3dfx.hr navedena je kao tekst, bez poveznice. DNS se ne dira.

## Pravila sadržaja

- Ne dodavati lozinke, API ključeve ni druge osjetljive podatke.
- Ne pohranjivati studentske radove ni osobne podatke studenata.
- Za primjere koristiti sintetičke podatke i materijale za koje postoje odgovarajuća prava korištenja.
