// utils/ipfsUploader.js
// IPFS'e belge yükleme ve getirme işlemleri

const { create } = require("@web3-storage/w3up-client");
// Alternatif: Pinata, Infura IPFS, veya lokal IPFS node

/**
 * DiplomaIPFSManager
 * Diploma belgelerini IPFS'e yükler ve metadata oluşturur.
 *
 * Kullanılan servis: Web3.Storage (ücretsiz) veya Pinata
 */
class DiplomaIPFSManager {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.pinataEndpoint = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  }

  /**
   * PDF veya görüntü dosyasını IPFS'e yükle
   * @param {Buffer} fileBuffer - Dosya içeriği
   * @param {string} fileName - Dosya adı
   * @param {object} metadata - Diploma metadata
   * @returns {string} IPFS CID
   */
  async uploadDiploma(fileBuffer, fileName, metadata) {
    // Önce metadata JSON'ını oluştur
    const diplomaMetadata = {
      name: fileName,
      description: `Diploma: ${metadata.degree} - ${metadata.recipientName}`,
      properties: {
        recipientName: metadata.recipientName,
        degree: metadata.degree,
        institution: metadata.institution,
        issueDate: metadata.issueDate,
        documentType: "AcademicDiploma",
        version: "1.0",
      },
    };

    // Pinata ile yükle
    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", fileBuffer, { filename: fileName });
    form.append(
      "pinataMetadata",
      JSON.stringify({ name: fileName, keyvalues: metadata })
    );
    form.append(
      "pinataOptions",
      JSON.stringify({ cidVersion: 1, wrapWithDirectory: false })
    );

    const response = await fetch(this.pinataEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`IPFS yükleme hatası: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✓ IPFS'e yüklendi:", result.IpfsHash);
    return result.IpfsHash; // CID
  }

  /**
   * Belgenin SHA-256 hash değerini hesapla
   * @param {Buffer} fileBuffer
   * @returns {string} 0x prefixli hex hash
   */
  static calculateHash(fileBuffer) {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    return "0x" + hash;
  }

  /**
   * IPFS'ten belgeyi getir
   * @param {string} cid
   * @returns {Buffer}
   */
  async fetchFromIPFS(cid) {
    const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
    if (!response.ok) throw new Error("IPFS'ten belge alınamadı");
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * CID'in hâlâ erişilebilir olduğunu kontrol et
   */
  async checkIPFSAvailability(cid) {
    try {
      const response = await fetch(`https://ipfs.io/ipfs/${cid}`, {
        method: "HEAD",
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ─── Kullanım Örneği ─────────────────────────────────────────────────

async function exampleUsage() {
  const fs = require("fs");
  const { ethers } = require("ethers");

  // 1. PDF dosyasını oku
  const pdfBuffer = fs.readFileSync("./diploma.pdf");

  // 2. Hash hesapla
  const documentHash = DiplomaIPFSManager.calculateHash(pdfBuffer);
  console.log("Belge Hash'i:", documentHash);

  // 3. IPFS'e yükle
  const ipfs = new DiplomaIPFSManager(process.env.PINATA_JWT);
  const cid = await ipfs.uploadDiploma(pdfBuffer, "diploma_ahmet_yilmaz.pdf", {
    recipientName: "Ahmet Yılmaz",
    degree: "Bilgisayar Mühendisliği Lisans",
    institution: "İstanbul Teknik Üniversitesi",
    issueDate: "2024-06-15",
  });
  console.log("IPFS CID:", cid);

  // 4. Ethereum contract'a kaydet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const abi = require("../artifacts/contracts/DiplomaRegistry.sol/DiplomaRegistry.json").abi;
  const registry = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);

  const tx = await registry.issueDiploma(
    documentHash,
    cid,
    "Ahmet Yılmaz",
    "Bilgisayar Mühendisliği Lisans"
  );

  await tx.wait();
  console.log("✓ Blokzincire kaydedildi! TX:", tx.hash);

  // 5. Doğrula
  const result = await registry.verifyDiploma(documentHash);
  console.log("\nDoğrulama Sonucu:");
  console.log("  Geçerli mi?  :", result.valid);
  console.log("  Kurum        :", result.institutionName);
  console.log("  IPFS Linki   :", `https://ipfs.io/ipfs/${result.ipfsCid}`);
}

module.exports = { DiplomaIPFSManager };
