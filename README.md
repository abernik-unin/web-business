# web-business

Radna web-stranica studija **3dfx visual studio**. Javni tekst je na hrvatskom. Ovo je prva inačica za pregled: nije objavljena i nije povezana s domenom.

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

- Nema prave adrese e-pošte, telefona ni sjedišta. Na stranici piše da još nisu uneseni.
- Obrazac nije povezan. Provjera javlja da poruka nije poslana i ne šalje podatke.
- Nema portfelja, izjava, imena klijenata, brojki ni potvrda.
- Pravne stranice dolaze prije javne objave.
- U zaglavlju stoji `noindex`, da se radna inačica ne nudi za indeksiranje. To treba ukloniti tek uz stvarnu objavu.

Domena 3dfx.hr navedena je kao tekst, bez poveznice. DNS se ne dira.

## Pravila sadržaja

- Ne dodavati lozinke, API ključeve ni druge osjetljive podatke.
- Ne pohranjivati studentske radove ni osobne podatke studenata.
- Za primjere koristiti sintetičke podatke i materijale za koje postoje odgovarajuća prava korištenja.
