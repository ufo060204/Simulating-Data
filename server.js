const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
// 使用 Render 的環境變數或預設值
const port = process.env.PORT || 3000;

// 設定 CORS
app.use(
  cors({
    // 在生產環境中，你應該限制允許的來源
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://你的前端網域.com"]
        : ["http://localhost:3000", "http://localhost:5173"],
  })
);
app.use(express.json());

// 健康檢查端點（Render 會用來確認服務是否正常運行）
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// 讀取診所資料
const loadClinicsData = () => {
  const filePath = path.join(__dirname, "data", "clinics.json");
  try {
    const rawData = fs.readFileSync(filePath, "utf8");
    return JSON.parse(rawData).clinics;
  } catch (error) {
    console.error("Error loading clinics data:", error);
    return [];
  }
};

// 取得診所資料
let clinics = loadClinicsData();

// API 路由
app.get("/api/clinics", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedClinics = clinics.slice(startIndex, endIndex);

    res.json({
      total: clinics.length,
      page,
      limit,
      data: paginatedClinics,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET 取得單一診所詳細資料
app.get("/api/clinics/:id", (req, res) => {
  const clinic = clinics.find((c) => c.id === parseInt(req.params.id));
  if (!clinic) {
    return res.status(404).json({ message: "找不到該診所" });
  }
  res.json(clinic);
});

// GET 依照專科搜尋診所
app.get("/api/clinics/search/specialty", (req, res) => {
  const specialty = req.query.specialty;
  if (!specialty) {
    return res.status(400).json({ message: "請提供專科名稱" });
  }

  const filteredClinics = clinics.filter((clinic) =>
    clinic.specialties.includes(specialty)
  );

  res.json({
    total: filteredClinics.length,
    data: filteredClinics,
  });
});

// GET 依照地區搜尋診所
app.get("/api/clinics/search/area", (req, res) => {
  const area = req.query.area;
  if (!area) {
    return res.status(400).json({ message: "請提供地區名稱" });
  }

  const filteredClinics = clinics.filter((clinic) =>
    clinic.address.includes(area)
  );

  res.json({
    total: filteredClinics.length,
    data: filteredClinics,
  });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
