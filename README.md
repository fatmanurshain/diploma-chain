# 🎓 DiplomaChain

> Blokzincir tabanlı akademik diploma doğrulama sistemi — SHA-256 hash değerlerinin Polygon Amoy testnet üzerinde değiştirilemez biçimde saklanması ve işe alım süreçlerinde anlık doğrulanması.

![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?style=flat-square&logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-yellow?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-13%2F13%20passing-brightgreen?style=flat-square)
![Network](https://img.shields.io/badge/Network-Polygon%20Amoy-8247e5?style=flat-square)

---

## 📌 Proje Hakkında

DiplomaChain, eğitim kurumlarının verdiği akademik belgelerin sahteciliğini önlemek amacıyla geliştirilmiş bir **Proof of Concept** sistemidir.

**Temel fikir:** Diploma PDF'inin SHA-256 hash değeri blokzincire yazıldıktan sonra hiçbir otorite tarafından değiştirilemez veya silinemez. İşverenler, herhangi bir merkezi sisteme bağımlı olmaksızın saniyeler içinde doğrulama yapabilir.

### Neden Blokzincir?

| Geleneksel Sistem | DiplomaChain |
|---|---|
| Merkezi sunucu bağımlılığı | Merkeziyetsiz, tek nokta yok |
| Günler süren doğrulama | Anlık, ücretsiz sorgulama |
| Manipülasyona açık belgeler | Hash eşleşmesi zorunlu |
| Kurumla iletişim gerekli | Akıllı sözleşme otomatik yanıt verir |

---

## 🌐 Canlı Contract (Polygon Amoy Testnet)

```
Contract Adresi : 0x6832883FB1A5F628B42f22f89524C8CC33C75C7E
Ağ              : Polygon Amoy (Zincir ID: 80002)
Blok            : #38352837
```

Polygonscan'de görüntüle:
```
https://amoy.polygonscan.com/address/0x6832883FB1A5F628B42f22f89524C8CC33C75C7E
```

---

## 🏗️ Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────┐
│                    SUNUM KATMANI                        │
│          HTML5 · CSS3 · ethers.js · Web Crypto API      │
│   SHA-256 hash tarayıcıda hesaplanır, sunucuya gitmez   │
└───────────────────┬─────────────────┬───────────────────┘
                    │                 │
          ┌─────────▼──────┐  ┌───────▼────────┐
          │ DEPOLAMA       │  │ BLOKZİNCİR     │
          │ KATMANI        │  │ KATMANI        │
          │                │  │                │
          │ IPFS · Pinata  │  │ Solidity 0.8.19│
          │ PDF dosyaları  │  │ Hardhat        │
          │ içerik-adresli │  │ Polygon Amoy   │
          │ CID ile erişim │  │ DiplomaRegistry│
          └────────────────┘  └────────────────┘
```

### Kayıt Akışı

```
PDF → SHA-256 Hash → IPFS Upload (CID) → issueDiploma(hash, cid) → Blok Onayı
```

### Doğrulama Akışı

```
PDF → SHA-256 Hash → verifyDiploma(hash) → Sonuç (Geçerli / Bulunamadı)
```

---

## 🔧 Teknoloji Stack

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| Smart Contract | Solidity 0.8.19 | Diploma kayıt ve doğrulama mantığı |
| Geliştirme Ortamı | Hardhat 2.19 | Derleme, test, deploy |
| Frontend | HTML5 + ethers.js 6.7 | Arayüz + blokzincir etkileşimi |
| Dosya Depolama | IPFS + Pinata | Merkeziyetsiz PDF saklama |
| Ağ | Polygon Amoy Testnet | Düşük maliyetli EVM uyumlu ağ |
| Hash Algoritması | SHA-256 (Web Crypto API) | Belge parmak izi |
| Cüzdan | MetaMask | İşlem imzalama |

---

## 📁 Proje Yapısı

```
diploma_chain/
├── contracts/
│   └── DiplomaRegistry.sol      # Ana smart contract
├── scripts/
│   └── deploy.js                # Deploy scripti
├── test/
│   └── DiplomaRegistry.test.js  # 13 birim testi
├── utils/
│   └── ipfsUploader.js          # IPFS yükleme yardımcısı
├── diploma-chain.html           # Frontend arayüzü
├── hardhat.config.js            # Hardhat konfigürasyonu
├── package.json
├── deployment.json              # Deploy bilgileri
├── .env.example                 # Ortam değişkenleri şablonu
└── README.md
```

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- [Node.js](https://nodejs.org) v18 veya üzeri
- [MetaMask](https://metamask.io) tarayıcı eklentisi
- [Pinata](https://app.pinata.cloud) hesabı (IPFS için)
- [Alchemy](https://alchemy.com) hesabı (Polygon Amoy RPC için)

### 1. Repoyu klonla

```bash
git clone https://github.com/fatmanurshain/diploma-chain.git
cd diploma-chain
```

### 2. Bağımlılıkları yükle

```bash
npm install
```

### 3. Ortam değişkenlerini ayarla

```bash
cp .env.example .env
```

`.env` dosyasını düzenle:

```env
PRIVATE_KEY=0x...                          # MetaMask private key
POLYGON_MUMBAI_RPC=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
POLYGONSCAN_API_KEY=...                    # Polygonscan API key
PINATA_JWT=...                             # Pinata JWT token
```

---

## 💻 Çalıştırma

Contract Polygon Amoy'a deploy edilmiş durumda. Sadece web sunucusunu başlatman yeterli:

```bash
npx http-server . -p 3001 --cors
```

Tarayıcıda aç:
```
http://localhost:3001/diploma-chain.html
```

MetaMask'ta **Polygon Amoy** ağını seç ve devam et.

### Lokal Geliştirme (İsteğe Bağlı)

Lokal ortamda test etmek istersen üç terminal gerekli:

**Terminal 1 — Lokal blokzinciri başlat:**
```bash
npx hardhat node
```

**Terminal 2 — Contract'ı deploy et:**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

**Terminal 3 — Web sunucusunu başlat:**
```bash
npx http-server . -p 3001 --cors
```

---

## 🧪 Testleri Çalıştır

```bash
npx hardhat test
```

**Beklenen çıktı:**

```
  DiplomaRegistry
    Kurum Yetkilendirme
      ✔ Owner yeni kurum yetkilendirebilmeli
      ✔ Yetkisiz adres kurum ekleyememeli
      ✔ Kurum yetkisi kaldırılabilmeli
    Diploma Kaydı
      ✔ Yetkili kurum diploma kaydedebilmeli
      ✔ Yetkisiz kurum diploma kaydedememeli
      ✔ Aynı hash iki kez kaydedilememeli (sahte kopya önleme)
      ✔ Boş hash ile kayıt yapılamamalı
    Diploma Doğrulama
      ✔ Geçerli diploma doğrulanabilmeli
      ✔ Kayıtlı olmayan hash geçersiz döndürmeli
      ✔ İptal edilen diploma geçersiz döndürmeli
    Diploma İptali
      ✔ Veren kurum diplomayı iptal edebilmeli
      ✔ Başka kurum iptal edememeli
      ✔ Zaten iptal edilmiş diploma tekrar iptal edilememeli

  13 passing (823ms)
```

---

## 📄 Smart Contract Fonksiyonları

### `issueDiploma(bytes32 hash, string cid, string name, string degree)`
Yeni diploma kaydı oluşturur. Sadece yetkili kurumlar çağırabilir.

### `verifyDiploma(bytes32 hash)`
Hash değerine göre diploma doğrular. Gas ücretsiz view fonksiyon.

**Döndürür:** `valid`, `ipfsCid`, `institution`, `institutionName`, `issuedAt`, `isRevoked`, `recipientName`, `degree`

### `revokeDiploma(bytes32 hash)`
Diplomanın `isRevoked` bayrağını `true` olarak işaretler. Kayıt silinmez.

### `authorizeInstitution(address institution, string name)`
Yeni kurum yetkilendirir. Sadece contract sahibi çağırabilir.

---

## 🔒 Güvenlik

| Tehdit | Durum | Önlem |
|--------|-------|-------|
| Sahte diploma üretimi | ✅ Elimine | Hash eşleşmesi zorunlu |
| Belge manipülasyonu | ✅ Elimine | Hash değişince eşleşme bozulur |
| Yetkisiz kayıt | 🟡 Düşük | `onlyAuthorized` modifier |
| IPFS erişim kaybı | 🟡 Orta | Pinata ile sabitleme |
| Private key güvenliği | 🔴 Dikkat | Production'da multisig önerilir |

**KVKK Uyumu:** TC kimlik no ve kritik kişisel veriler zincire yazılmaz. Zincirde yalnızca hash ve IPFS CID saklanır.

---

## 🗺️ Yol Haritası

- [x] Smart contract geliştirme
- [x] Birim testleri (13/13)
- [x] Lokal deploy ve doğrulama
- [x] Frontend arayüzü
- [x] IPFS entegrasyonu (Pinata)
- [x] MetaMask entegrasyonu
- [x] Polygon Amoy testnet deploy
- [x] Gerçek PDF kayıt ve doğrulama akışı
- [ ] Polygon Mainnet deploy
- [ ] QR kod doğrulama
- [ ] Merkle Tree toplu kayıt
- [ ] Sıfır bilgi ispatı (ZK Proof)

---

## 📚 Kaynaklar

- [Solidity Docs](https://docs.soliditylang.org)
- [Hardhat Docs](https://hardhat.org/docs)
- [IPFS Docs](https://docs.ipfs.tech)
- [ethers.js v6](https://docs.ethers.org/v6/)
- [Pinata](https://docs.pinata.cloud)
- [Polygon Amoy](https://polygon.technology/developers)
