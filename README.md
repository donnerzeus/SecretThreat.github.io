# 🕵️‍♂️ Secret Threat

**Secret Threat**, *Secret Hitler* oyunundan esinlenilmiş, modern web teknolojileriyle geliştirilmiş, gerçek zamanlı bir sosyal çıkarım (social deduction) oyunudur. Oyuncular **Guardians (Liberals)** ve **Shadows (Fascists)** olmak üzere iki takıma ayrılır. Amaç, kendi takımının politikalarını geçirmek veya karşı takımı sabote etmektir.

![Game Screenshot](https://via.placeholder.com/800x400?text=Secret+Threat+Game+Preview)

---

## 🚀 Tech Stack

Bu proje, performans, ölçeklenebilirlik ve geliştirici deneyimi için modern bir teknoloji yığını kullanır.

### Frontend
- **React 18**: Kullanıcı arayüzü ve bileşen yönetimi.
- **TypeScript**: Tip güvenliği ve kod kalitesi.
- **Vite**: Hızlı geliştirme sunucusu ve optimize edilmiş build süreci.
- **Tailwind CSS**: Hızlı ve esnek stil tanımlamaları.
- **Framer Motion**: Akıcı animasyonlar (kart çevirme, geçişler vb.).
- **Lucide React**: Modern ikon seti.

### Backend & Services
- **Firebase Firestore**: Gerçek zamanlı oyun durumu (state) senkronizasyonu.
- **Firebase Auth**: Anonim kimlik doğrulama sistemi.
- **Firebase Hosting**: Hızlı ve güvenli statik site barındırma.
- **GitHub Actions**: CI/CD süreçleri (Otomatik build ve deploy).

---

## 🏗️ Mimari ve Çalışma Mantığı

Secret Threat, **Serverless** ve **Client-Side Logic** hibrit bir yaklaşımla tasarlanmıştır. Maliyet optimizasyonu ve hız için oyun mantığının büyük bir kısmı istemci tarafında (Client-Side) güvenli işlemlerle yürütülür.

### 1. Oyun Durumu (Game State)
Tüm oyun verileri Firestore üzerinde `rooms/{roomId}` dokümanında tutulur.
- **Real-time Sync**: React tarafında `onSnapshot` dinleyicileri ile veritabanındaki her değişiklik anlık olarak tüm oyuncuların ekranına yansır.
- **Optimistic UI**: Kullanıcı etkileşimleri anında arayüze yansıtılırken arka planda sunucu senkronizasyonu sağlanır.

### 2. Oyun Mantığı (Game Logic)
Oyun kuralları ve aksiyonları (`gameService.ts`) içinde merkezi olarak yönetilir.
- **Transaction Based**: Kritik işlemler (oy verme, kart seçme, rol dağıtımı) Firestore Transaction'ları ile atomik olarak gerçekleştirilir. Bu sayede "Race Condition" (yarış durumu) hataları önlenir.
- **Role Management**: Roller oyun başında rastgele dağıtılır ve `playerRoles` alt koleksiyonunda saklanır. Bu koleksiyon, istemci tarafında sadece ilgili oyuncunun görebileceği şekilde (Firestore Security Rules ile) korunabilir (Geliştirme aşamasında client-side logic ağırlıklıdır).

### 3. Ses ve Atmosfer
- **useGameSounds Hook**: Oyunun durumuna (Lobby, Voting, Game Over) göre dinamik olarak değişen arka plan müzikleri ve ses efektleri (SFX) yönetilir.
- **Audio State**: Sesler global bir state yerine, oyunun o anki fazına (`turnPhase`) tepki veren bir hook yapısıyla kontrol edilir.

---

## 📂 Proje Yapısı

```bash
src/
├── components/
│   ├── game/          # Oyun tahtası, kartlar, loglar, oylama ekranları
│   │   ├── ActionLog.tsx
│   │   ├── GameBoard.tsx
│   │   ├── IdentityCard.tsx
│   │   └── ...
│   ├── ui/            # Yeniden kullanılabilir UI bileşenleri (Button, Card, Input)
│   └── Layout.tsx     # Ana sayfa düzeni
├── hooks/
│   ├── useAuth.ts     # Firebase Authentication hook'u
│   └── useGameSounds.ts # Ses yönetimi hook'u
├── pages/
│   ├── GameRoom.tsx   # Oyun odası ve lobi mantığı
│   ├── Lobby.tsx      # Oda oluşturma/katılma ekranı
│   └── Login.tsx      # Giriş ekranı
├── services/
│   ├── firebase.ts    # Firebase konfigürasyonu
│   └── gameService.ts # Tüm oyun mantığı ve Firestore işlemleri
├── types/
│   └── index.ts       # TypeScript tip tanımlamaları
└── App.tsx            # Routing ve ana uygulama
```

---

## 🎮 Nasıl Oynanır?

1.  **Oda Oluştur**: Bir oyuncu oda kurar ve kodu arkadaşlarıyla paylaşır.
2.  **Rol Dağıtımı**: Oyun başladığında herkese gizli bir rol verilir (Guardian, Shadow veya Secret Threat).
3.  **Hükümet Seçimi**: Her tur bir Başkan (President) seçilir, o da bir Şansölye (Chancellor) adayı gösterir. Tüm oyuncular bu hükümeti oylar.
4.  **Yasama**: Hükümet seçilirse, Başkan 3 kart çeker, 1'ini atar ve 2'sini Şansölye'ye verir. Şansölye de 1'ini atar ve kalan kartı yasa olarak geçirir.
5.  **Kazanma Koşulları**:
    *   **Guardians**: 5 Guardian yasası geçirmek veya Secret Threat'i öldürmek.
    *   **Shadows**: 6 Shadow yasası geçirmek veya 3 Shadow yasasından sonra Secret Threat'i Şansölye seçtirmek.

---

## 🛠️ Kurulum ve Geliştirme

Projeyi yerel ortamınızda çalıştırmak için:

1.  Repoyu klonlayın:
    ```bash
    git clone https://github.com/donnerzeus/SecretThreat.github.io.git
    cd SecretThreat.github.io
    ```

2.  Bağımlılıkları yükleyin:
    ```bash
    npm install
    ```

3.  Geliştirme sunucusunu başlatın:
    ```bash
    npm run dev
    ```

4.  Build almak için:
    - **GitHub Pages için**: `npm run build:gh`
    - **Firebase için**: `npm run build`

---

## 📄 Lisans

Bu proje MIT lisansı ile lisanslanmıştır.
