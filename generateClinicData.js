const fs = require("fs");
const path = require("path");

const generateClinics = () => {
  const clinics = Array(50)
    .fill()
    .map((_, index) => ({
      id: index + 1,
      name: `康健診所${index + 1}`,
      director: {
        name: `張醫生${index + 1}`,
        title: "院長",
        specialties: ["家醫科", "內科"],
      },
      doctors: [
        {
          name: `李醫生${index + 1}A`,
          title: "主治醫師",
          specialties: ["小兒科", "過敏免疫科"],
        },
        {
          name: `王醫生${index + 1}B`,
          title: "主治醫師",
          specialties: ["骨科", "復健科"],
        },
      ],
      specialties: ["家醫科", "內科", "小兒科", "骨科", "復健科"],
      address: `台北市信義區信義路${index + 1}段${100 + index}號`,
      phone: `02-2${String(index).padStart(3, "0")}-${String(
        1000 + index
      ).padStart(4, "0")}`,
      openingHours: {
        weekday: "09:00-21:00",
        weekend: "09:00-17:00",
      },
      services: ["一般門診", "預防注射", "健康檢查", "外傷處理"],
      facilities: ["X光室", "檢驗室", "復健室"],
    }));

  const data = { clinics };

  // 確保 data 目錄存在
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // 寫入 JSON 檔案
  fs.writeFileSync(
    path.join(dataDir, "clinics.json"),
    JSON.stringify(data, null, 2),
    "utf8"
  );

  console.log("成功生成診所資料！");
};

generateClinics();
