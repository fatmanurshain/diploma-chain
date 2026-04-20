// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DiplomaRegistry
 * @dev Akademik sertifika ve diploma doğrulama sistemi
 * @notice Eğitim kurumlarının verdiği belgelerin blokzincirde doğrulanması
 */
contract DiplomaRegistry {

    // ─── Veri Yapıları ───────────────────────────────────────────────

    struct Diploma {
        bytes32 documentHash;       // SHA-256 belge hash'i
        string  ipfsCid;            // IPFS içerik tanımlayıcısı
        address issuingInstitution; // Veren kurumun adresi
        uint256 issuedAt;           // Unix timestamp
        bool    isRevoked;          // İptal edildi mi?
        string  recipientName;      // Mezunun adı (isteğe bağlı)
        string  degree;             // Derece adı (örn. "Bilgisayar Müh. Lisans")
    }

    // ─── State Variables ─────────────────────────────────────────────

    address public owner;

    // documentHash => Diploma struct
    mapping(bytes32 => Diploma) private diplomas;

    // Yetkili kurumlar
    mapping(address => bool) public authorizedInstitutions;
    mapping(address => string) public institutionNames;

    // İstatistik
    uint256 public totalIssued;
    uint256 public totalRevoked;

    // ─── Events ──────────────────────────────────────────────────────

    event DiplomaIssued(
        bytes32 indexed documentHash,
        string  ipfsCid,
        address indexed institution,
        string  recipientName,
        string  degree,
        uint256 timestamp
    );

    event DiplomaRevoked(
        bytes32 indexed documentHash,
        address indexed revokedBy,
        uint256 timestamp
    );

    event InstitutionAuthorized(address indexed institution, string name);
    event InstitutionRevoked(address indexed institution);

    // ─── Modifiers ───────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Sadece sahip bu islemi yapabilir");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedInstitutions[msg.sender],
            "Yetkisiz kurum: once yetkilendirme gerekli"
        );
        _;
    }

    modifier diplomaExists(bytes32 _hash) {
        require(
            diplomas[_hash].issuedAt != 0,
            "Bu hash ile kayitli diploma bulunamadi"
        );
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        // Sözleşme sahibini de yetkili yap
        authorizedInstitutions[msg.sender] = true;
        institutionNames[msg.sender] = "Contract Owner";
    }

    // ─── Admin Fonksiyonları ──────────────────────────────────────────

    /**
     * @dev Yeni bir kurumu yetkilendir
     * @param _institution Kurumun Ethereum adresi
     * @param _name Kurumun resmi adı
     */
    function authorizeInstitution(
        address _institution,
        string calldata _name
    ) external onlyOwner {
        require(_institution != address(0), "Gecersiz adres");
        require(bytes(_name).length > 0, "Kurum adi bos olamaz");

        authorizedInstitutions[_institution] = true;
        institutionNames[_institution] = _name;

        emit InstitutionAuthorized(_institution, _name);
    }

    /**
     * @dev Bir kurumun yetkisini kaldır
     */
    function revokeInstitution(address _institution) external onlyOwner {
        authorizedInstitutions[_institution] = false;
        emit InstitutionRevoked(_institution);
    }

    // ─── Ana Fonksiyonlar ─────────────────────────────────────────────

    /**
     * @dev Yeni diploma kaydı oluştur
     * @param _documentHash Belgenin SHA-256 hash değeri (bytes32)
     * @param _ipfsCid IPFS'te saklanan belgenin CID'i
     * @param _recipientName Diplomanın verildiği kişinin adı
     * @param _degree Alınan derece / program adı
     */
    function issueDiploma(
        bytes32 _documentHash,
        string calldata _ipfsCid,
        string calldata _recipientName,
        string calldata _degree
    ) external onlyAuthorized {
        require(_documentHash != bytes32(0), "Hash deger bos olamaz");
        require(bytes(_ipfsCid).length > 0, "IPFS CID bos olamaz");
        require(
            diplomas[_documentHash].issuedAt == 0,
            "Bu hash zaten kayitli: muhtemel kopya"
        );

        diplomas[_documentHash] = Diploma({
            documentHash:       _documentHash,
            ipfsCid:            _ipfsCid,
            issuingInstitution: msg.sender,
            issuedAt:           block.timestamp,
            isRevoked:          false,
            recipientName:      _recipientName,
            degree:             _degree
        });

        totalIssued++;

        emit DiplomaIssued(
            _documentHash,
            _ipfsCid,
            msg.sender,
            _recipientName,
            _degree,
            block.timestamp
        );
    }

    /**
     * @dev Diplomayı iptal et (örn. disiplin cezası, hata durumunda)
     * @param _documentHash İptal edilecek belgenin hash'i
     */
    function revokeDiploma(bytes32 _documentHash)
        external
        onlyAuthorized
        diplomaExists(_documentHash)
    {
        Diploma storage d = diplomas[_documentHash];
        require(!d.isRevoked, "Diploma zaten iptal edilmis");
        require(
            d.issuingInstitution == msg.sender || msg.sender == owner,
            "Sadece veren kurum veya sahip iptal edebilir"
        );

        d.isRevoked = true;
        totalRevoked++;

        emit DiplomaRevoked(_documentHash, msg.sender, block.timestamp);
    }

    // ─── Sorgulama Fonksiyonları ──────────────────────────────────────

    /**
     * @dev Diploma doğrula — işe alım sürecinde kullanılır
     * @param _documentHash Sorgulanacak belge hash'i
     * @return valid Geçerli mi?
     * @return ipfsCid IPFS bağlantısı
     * @return institution Veren kurum adresi
     * @return institutionName Veren kurum adı
     * @return issuedAt Veriliş tarihi (timestamp)
     * @return isRevoked İptal durumu
     * @return recipientName Mezun adı
     * @return degree Derece adı
     */
    function verifyDiploma(bytes32 _documentHash)
        external
        view
        returns (
            bool valid,
            string memory ipfsCid,
            address institution,
            string memory institutionName,
            uint256 issuedAt,
            bool isRevoked,
            string memory recipientName,
            string memory degree
        )
    {
        Diploma storage d = diplomas[_documentHash];

        if (d.issuedAt == 0) {
            // Kayıt yok
            return (false, "", address(0), "", 0, false, "", "");
        }

        return (
            !d.isRevoked,                              // iptal edilmemişse geçerli
            d.ipfsCid,
            d.issuingInstitution,
            institutionNames[d.issuingInstitution],
            d.issuedAt,
            d.isRevoked,
            d.recipientName,
            d.degree
        );
    }

    /**
     * @dev Hash değerinin kayıtlı olup olmadığını hızlıca kontrol et
     */
    function isRegistered(bytes32 _documentHash) external view returns (bool) {
        return diplomas[_documentHash].issuedAt != 0;
    }

    /**
     * @dev Belge dosyasından hash üret (off-chain yapılır, bu sadece örnek)
     * NOT: Gerçek uygulamada bu işlem frontend'de yapılır
     */
    function hashDocument(string calldata _content)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_content));
    }
}
