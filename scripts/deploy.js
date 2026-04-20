// scripts/deploy.js
// Polygon Mumbai veya Ethereum Sepolia testnet'e deploy

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DiplomaRegistry Deploy Scripti");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Deployer adresi :", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer bakiyesi:", hre.ethers.formatEther(balance), "ETH/MATIC\n");

  // Contract'ı derle ve deploy et
  const DiplomaRegistry = await hre.ethers.getContractFactory("DiplomaRegistry");
  console.log("Contract deploy ediliyor...");

  const registry = await DiplomaRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("✓ DiplomaRegistry deploy edildi:", address);

  // Örnek kurumları yetkilendir
  const universities = [
    { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", name: "İstanbul Teknik Üniversitesi" },
    { address: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", name: "Orta Doğu Teknik Üniversitesi" },
    { address: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2", name: "Boğaziçi Üniversitesi" },
  ];

  console.log("\nKurumlar yetkilendiriliyor...");
  for (const uni of universities) {
    const tx = await registry.authorizeInstitution(uni.address, uni.name);
    await tx.wait();
    console.log(`  ✓ ${uni.name}`);
  }

  // Örnek bir diploma kaydı
  console.log("\nÖrnek diploma kaydı oluşturuluyor...");
  const sampleHash = hre.ethers.keccak256(
    hre.ethers.toUtf8Bytes("sample-diploma-document-content-2024")
  );
  const tx = await registry.issueDiploma(
    sampleHash,
    "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", // örnek IPFS CID
    "Ahmet Yılmaz",
    "Bilgisayar Mühendisliği Lisans"
  );
  await tx.wait();
  console.log("  ✓ Örnek diploma kaydedildi");
  console.log("  Hash:", sampleHash);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("DEPLOYMENT ÖZETI");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract Adresi :", address);
  console.log("Ağ             :", hre.network.name);
  console.log("Block          :", await hre.ethers.provider.getBlockNumber());
  console.log("\nPolygonscan'de görüntüle:");
  console.log(`  https://mumbai.polygonscan.com/address/${address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Deployment bilgilerini kaydet
  const fs = require("fs");
  const deployInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    sampleHash: sampleHash,
  };
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deployInfo, null, 2)
  );
  console.log("✓ deployment.json kaydedildi");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
