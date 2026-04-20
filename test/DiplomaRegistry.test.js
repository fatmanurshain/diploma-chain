// test/DiplomaRegistry.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiplomaRegistry", function () {
  let registry;
  let owner, university, employer, stranger;

  // Test verisi
  const sampleDoc = "Bu bir test diploma belgesidir. Ahmet Yılmaz. 2024.";
  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes(sampleDoc));
  const sampleIpfsCid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
  const recipientName = "Ahmet Yılmaz";
  const degree = "Bilgisayar Mühendisliği Lisans";

  beforeEach(async function () {
    [owner, university, employer, stranger] = await ethers.getSigners();

    const DiplomaRegistry = await ethers.getContractFactory("DiplomaRegistry");
    registry = await DiplomaRegistry.deploy();
    await registry.waitForDeployment();
  });

  // ─── Yetkilendirme Testleri ───────────────────────────────────────

  describe("Kurum Yetkilendirme", function () {
    it("Owner yeni kurum yetkilendirebilmeli", async function () {
      await expect(
        registry.authorizeInstitution(university.address, "İTÜ")
      ).to.emit(registry, "InstitutionAuthorized")
        .withArgs(university.address, "İTÜ");

      expect(await registry.authorizedInstitutions(university.address)).to.equal(true);
      expect(await registry.institutionNames(university.address)).to.equal("İTÜ");
    });

    it("Yetkisiz adres kurum ekleyememeli", async function () {
      await expect(
        registry.connect(stranger).authorizeInstitution(employer.address, "Sahte Kurum")
      ).to.be.revertedWith("Sadece sahip bu islemi yapabilir");
    });

    it("Kurum yetkisi kaldırılabilmeli", async function () {
      await registry.authorizeInstitution(university.address, "İTÜ");
      await registry.revokeInstitution(university.address);
      expect(await registry.authorizedInstitutions(university.address)).to.equal(false);
    });
  });

  // ─── Diploma Kayıt Testleri ───────────────────────────────────────

  describe("Diploma Kaydı", function () {
    beforeEach(async function () {
      await registry.authorizeInstitution(university.address, "İstanbul Teknik Üniversitesi");
    });

    it("Yetkili kurum diploma kaydedebilmeli", async function () {
      await expect(
        registry.connect(university).issueDiploma(
          sampleHash, sampleIpfsCid, recipientName, degree
        )
      ).to.emit(registry, "DiplomaIssued")
        .withArgs(sampleHash, sampleIpfsCid, university.address, recipientName, degree, anyValue);

      expect(await registry.isRegistered(sampleHash)).to.equal(true);
      expect(await registry.totalIssued()).to.equal(1);
    });

    it("Yetkisiz kurum diploma kaydedememeli", async function () {
      await expect(
        registry.connect(stranger).issueDiploma(
          sampleHash, sampleIpfsCid, recipientName, degree
        )
      ).to.be.revertedWith("Yetkisiz kurum: once yetkilendirme gerekli");
    });

    it("Aynı hash iki kez kaydedilememeli (sahte kopya önleme)", async function () {
      await registry.connect(university).issueDiploma(
        sampleHash, sampleIpfsCid, recipientName, degree
      );

      await expect(
        registry.connect(university).issueDiploma(
          sampleHash, sampleIpfsCid, recipientName, degree
        )
      ).to.be.revertedWith("Bu hash zaten kayitli: muhtemel kopya");
    });

    it("Boş hash ile kayıt yapılamamalı", async function () {
      await expect(
        registry.connect(university).issueDiploma(
          ethers.ZeroHash, sampleIpfsCid, recipientName, degree
        )
      ).to.be.revertedWith("Hash deger bos olamaz");
    });
  });

  // ─── Doğrulama Testleri ───────────────────────────────────────────

  describe("Diploma Doğrulama", function () {
    beforeEach(async function () {
      await registry.authorizeInstitution(university.address, "İstanbul Teknik Üniversitesi");
      await registry.connect(university).issueDiploma(
        sampleHash, sampleIpfsCid, recipientName, degree
      );
    });

    it("Geçerli diploma doğrulanabilmeli", async function () {
      const result = await registry.verifyDiploma(sampleHash);

      expect(result.valid).to.equal(true);
      expect(result.ipfsCid).to.equal(sampleIpfsCid);
      expect(result.institution).to.equal(university.address);
      expect(result.institutionName).to.equal("İstanbul Teknik Üniversitesi");
      expect(result.isRevoked).to.equal(false);
      expect(result.recipientName).to.equal(recipientName);
      expect(result.degree).to.equal(degree);
    });

    it("Kayıtlı olmayan hash geçersiz döndürmeli", async function () {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("bilinmeyen belge"));
      const result = await registry.verifyDiploma(unknownHash);
      expect(result.valid).to.equal(false);
    });

    it("İptal edilen diploma geçersiz döndürmeli", async function () {
      await registry.connect(university).revokeDiploma(sampleHash);
      const result = await registry.verifyDiploma(sampleHash);
      expect(result.valid).to.equal(false);
      expect(result.isRevoked).to.equal(true);
    });
  });

  // ─── İptal Testleri ──────────────────────────────────────────────

  describe("Diploma İptali", function () {
    beforeEach(async function () {
      await registry.authorizeInstitution(university.address, "İTÜ");
      await registry.connect(university).issueDiploma(
        sampleHash, sampleIpfsCid, recipientName, degree
      );
    });

    it("Veren kurum diplomayı iptal edebilmeli", async function () {
      await expect(
        registry.connect(university).revokeDiploma(sampleHash)
      ).to.emit(registry, "DiplomaRevoked")
        .withArgs(sampleHash, university.address, anyValue);

      expect(await registry.totalRevoked()).to.equal(1);
    });

    it("Başka kurum iptal edememeli", async function () {
      await registry.authorizeInstitution(stranger.address, "Başka Kurum");
      await expect(
        registry.connect(stranger).revokeDiploma(sampleHash)
      ).to.be.revertedWith("Sadece veren kurum veya sahip iptal edebilir");
    });

    it("Zaten iptal edilmiş diploma tekrar iptal edilememeli", async function () {
      await registry.connect(university).revokeDiploma(sampleHash);
      await expect(
        registry.connect(university).revokeDiploma(sampleHash)
      ).to.be.revertedWith("Diploma zaten iptal edilmis");
    });
  });
});

function anyValue() { return true; }
