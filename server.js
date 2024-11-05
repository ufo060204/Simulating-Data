// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

// CORS 設定
app.use(
  cors({
    origin: [
      "http://localhost:3005",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 輔助函數：解析地址獲取地區
const parseAddress = (address) => {
  const match = address.match(/台北市([^區]+區)/);
  return match ? match[1] : null;
};

// 輔助函數：過濾診所資料
const filterClinics = (clinics, filters) => {
  return clinics.filter(clinic => {
    let match = true;
    
    // 依據類型過濾
    if (filters.type && clinic.type !== filters.type) {
      match = false;
    }
    
    // 依據評分過濾
    if (filters.minRating && clinic.rating.score < parseFloat(filters.minRating)) {
      match = false;
    }
    
    // 依據科別過濾
    if (filters.department && !clinic.departments.includes(filters.department)) {
      match = false;
    }
    
    // 依據服務項目過濾
    if (filters.service) {
      const hasService = clinic.services.some(service => 
        service.items.includes(filters.service)
      );
      if (!hasService) match = false;
    }
    
    // 依據特色過濾
    if (filters.feature) {
      const hasFeature = clinic.features[filters.feature] === true;
      if (!hasFeature) match = false;
    }

    // 依據地區過濾
    if (filters.district) {
      const clinicDistrict = parseAddress(clinic.contact.address);
      if (clinicDistrict !== filters.district) {
        match = false;
      }
    }

    // 依據完整地址關鍵字搜尋
    if (filters.address) {
      if (!clinic.contact.address.includes(filters.address)) {
        match = false;
      }
    }

    return match;
  });
};

// 讀取診所資料
const loadClinicsData = () => {
  try {
    const filePath = path.join(__dirname, 'data', 'clinics.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(rawData).clinics;
  } catch (error) {
    console.error('Error loading clinics data:', error);
    return [];
  }
};

const clinics = loadClinicsData();

// 基本路由：取得所有診所
app.get("/api/clinics", (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      minRating,
      department,
      service,
      feature,
      sort,
    } = req.query;

    let filteredClinics = [...clinics];

    // 應用過濾
    filteredClinics = filterClinics(filteredClinics, {
      type,
      minRating,
      department,
      service,
      feature,
    });

    // 排序
    if (sort) {
      switch (sort) {
        case "rating":
          filteredClinics.sort((a, b) => b.rating.score - a.rating.score);
          break;
        case "reviews":
          filteredClinics.sort(
            (a, b) => b.rating.reviewCount - a.rating.reviewCount
          );
          break;
        // 可以添加其他排序選項
      }
    }

    // 分頁
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedClinics = filteredClinics.slice(startIndex, endIndex);

    res.json({
      total: filteredClinics.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: paginatedClinics,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 取得單一診所詳細資料
app.get("/api/clinics/:id", (req, res) => {
  try {
    const clinic = clinics.find((c) => c.id === parseInt(req.params.id));
    if (!clinic) {
      return res.status(404).json({ message: "找不到該診所" });
    }
    res.json(clinic);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 搜尋醫生
app.get("/api/doctors/search", (req, res) => {
  try {
    const { name, specialty } = req.query;
    let doctors = [];

    clinics.forEach((clinic) => {
      // 搜尋院長
      if (clinic.medicalTeam.director) {
        if (
          (!name || clinic.medicalTeam.director.name.includes(name)) &&
          (!specialty ||
            clinic.medicalTeam.director.specialties.includes(specialty))
        ) {
          doctors.push({
            ...clinic.medicalTeam.director,
            clinicId: clinic.id,
            clinicName: clinic.name,
          });
        }
      }

      // 搜尋其他醫生
      if (clinic.medicalTeam.doctors) {
        clinic.medicalTeam.doctors.forEach((doctor) => {
          if (
            (!name || doctor.name.includes(name)) &&
            (!specialty || doctor.specialties.includes(specialty))
          ) {
            doctors.push({
              ...doctor,
              clinicId: clinic.id,
              clinicName: clinic.name,
            });
          }
        });
      }
    });

    res.json({
      total: doctors.length,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 取得所有科別列表
app.get("/api/departments", (req, res) => {
  try {
    const departments = new Set();
    clinics.forEach((clinic) => {
      clinic.departments.forEach((dept) => departments.add(dept));
    });

    res.json(Array.from(departments));
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 取得所有診所列表（包含地區搜尋）
app.get('/api/clinics', (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      minRating,
      department,
      service,
      feature,
      district,  // 新增：地區搜尋
      address,   // 新增：地址關鍵字搜尋
      sort
    } = req.query;

    let filteredClinics = [...clinics];

    // 應用過濾
    filteredClinics = filterClinics(filteredClinics, {
      type,
      minRating,
      department,
      service,
      feature,
      district,
      address
    });

    // 排序
    if (sort) {
      switch (sort) {
        case 'rating':
          filteredClinics.sort((a, b) => b.rating.score - a.rating.score);
          break;
        case 'reviews':
          filteredClinics.sort((a, b) => b.rating.reviewCount - a.rating.reviewCount);
          break;
        // 可以添加其他排序選項
      }
    }

    // 分頁
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedClinics = filteredClinics.slice(startIndex, endIndex);

    res.json({
      total: filteredClinics.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: paginatedClinics
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 新增：取得所有地區列表
app.get('/api/districts', (req, res) => {
  try {
    const districts = new Set();
    clinics.forEach(clinic => {
      const district = parseAddress(clinic.contact.address);
      if (district) {
        districts.add(district);
      }
    });
    
    res.json(Array.from(districts).sort());
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 新增：依地區搜尋診所
app.get('/api/clinics/by-district/:district', (req, res) => {
  try {
    const { district } = req.params;
    const { minRating, sort } = req.query;

    let districtClinics = clinics.filter(clinic => {
      const clinicDistrict = parseAddress(clinic.contact.address);
      return clinicDistrict === district;
    });

    // 應用評分過濾
    if (minRating) {
      districtClinics = districtClinics.filter(clinic => 
        clinic.rating.score >= parseFloat(minRating)
      );
    }

    // 應用排序
    if (sort === 'rating') {
      districtClinics.sort((a, b) => b.rating.score - a.rating.score);
    }

    res.json({
      district,
      total: districtClinics.length,
      data: districtClinics
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 新增：搜尋附近診所（根據經緯度）
app.get('/api/clinics/nearby', (req, res) => {
  try {
    const { lat, lng, radius = 1 } = req.query; // radius in kilometers

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // 計算兩點之間的距離（使用 Haversine 公式）
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // 地球半徑（公里）
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // 尋找附近的診所
    const nearbyClinics = clinics
      .map(clinic => ({
        ...clinic,
        distance: calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          clinic.contact.location.lat,
          clinic.contact.location.lng
        )
      }))
      .filter(clinic => clinic.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    res.json({
      total: nearbyClinics.length,
      data: nearbyClinics
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
