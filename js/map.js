// 等待DOM加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
  // 获取Canvas元素和上下文
  const canvas = document.getElementById('mapCanvas');
  const ctx = canvas.getContext('2d');
  
  // 设置Canvas实际尺寸（解决模糊问题）
  canvas.width = 1000;
  canvas.height = 700;

  // 全局状态
  let currentFloor = 'outdoor'; // 当前楼层：outdoor,1,-1,-2
  let scale = 1; // 缩放比例
  let offsetX = 0; // 平移X偏移
  let offsetY = 0; // 平移Y偏移
  let isDragging = false;
  let lastX, lastY;

  // 店铺数据结构（示例，每层60家，这里简化为自动生成）
  const floorData = {
    outdoor: {
      name: '室外',
      shops: [], // 室外无店铺
      walls: [],
      passages: [[100, 350, 800, 350]] // 主通道
    },
    1: {
      name: '1层',
      shops: generateShops(60, 100, 100, 800, 500), // 生成60家店铺
      walls: [
        [100, 100, 800, 100], // 上边界
        [800, 100, 800, 600], // 右边界
        [100, 600, 800, 600], // 下边界
        [100, 100, 100, 600]  // 左边界
      ],
      passages: [
        [100, 350, 800, 350], // 主通道
        [450, 100, 450, 600]  // 垂直通道
      ]
    },
    '-1': {
      name: '负1层',
      shops: generateShops(60, 100, 100, 800, 500),
      walls: [
        [100, 100, 800, 100],
        [800, 100, 800, 600],
        [100, 600, 800, 600],
        [100, 100, 100, 600]
      ],
      passages: [
        [100, 250, 800, 250],
        [100, 450, 800, 450],
        [300, 100, 300, 600],
        [700, 100, 700, 600]
      ]
    },
    '-2': {
      name: '负2层',
      shops: generateShops(60, 100, 100, 800, 500),
      walls: [
        [100, 100, 800, 100],
        [800, 100, 800, 600],
        [100, 600, 800, 600],
        [100, 100, 100, 600]
      ],
      passages: [
        [200, 350, 700, 350],
        [450, 200, 450, 500]
      ]
    }
  };

  // 生成店铺数据（数量，区域范围）
  function generateShops(count, minX, minY, maxX, maxY) {
    const shops = [];
    const shopWidth = 50;
    const shopHeight = 40;
    let x = minX + 20;
    let y = minY + 20;
    
    for (let i = 1; i <= count; i++) {
      // 自动排列店铺（可根据实际布局修改坐标）
      shops.push({
        id: `${currentFloor}-${i}`,
        name: `店铺${i}`,
        x,
        y,
        width: shopWidth,
        height: shopHeight,
        color: `hsl(${i * 5}, 70%, 80%)` // 不同颜色区分
      });
      
      x += shopWidth + 10;
      if (x + shopWidth > maxX) {
        x = minX + 20;
        y += shopHeight + 10;
        if (y + shopHeight > maxY) y = minY + 20; // 超出范围换行
      }
    }
    return shops;
  }

  // 绘制3D拱形地铁口（室外区域）
  function drawSubwayEntrance() {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    // 拱形基础（3D效果通过阴影和渐变实现）
    const centerX = 500;
    const centerY = 350;
    const width = 150;
    const height = 100;
    
    // 底部矩形
    ctx.fillStyle = '#888';
    ctx.fillRect(centerX - width/2, centerY, width, 30);
    
    // 拱形顶部（3D透视）
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, width/2
    );
    gradient.addColorStop(0, '#aaa');
    gradient.addColorStop(1, '#666');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, width/2, Math.PI, 0, false); // 上半圆
    ctx.fill();
    
    // 拱内阴影（增强3D感）
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, width/2 - 5, Math.PI, 0, false);
    ctx.fill();
    
    // 地铁口文字
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('地铁入口', centerX, centerY + 15);
    
    ctx.restore();
  }

  // 绘制当前楼层地图
  function drawMap() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制室外区域
    if (currentFloor === 'outdoor') {
      // 室外地面
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#e0f7fa';
      ctx.fillRect(50, 50, 900, 600);
      
      // 道路
      ctx.fillStyle = '#ccc';
      ctx.fillRect(100, 320, 800, 60);
      
      // 商场入口
      ctx.fillStyle = '#ffcc80';
      ctx.fillRect(450, 50, 100, 50);
      ctx.fillStyle = 'black';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('商场主入口', 500, 80);
      ctx.restore();
      
      // 绘制3D地铁口
      drawSubwayEntrance();
      return;
    }
    
    // 绘制楼层（1层/-1层/-2层）
    const data = floorData[currentFloor];
    
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    // 绘制背景
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(50, 50, 900, 600);
    
    // 绘制墙壁
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    data.walls.forEach(wall => {
      ctx.beginPath();
      ctx.moveTo(wall[0], wall[1]);
      ctx.lineTo(wall[2], wall[3]);
      ctx.stroke();
    });
    
    // 绘制通道
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    data.passages.forEach(passage => {
      ctx.beginPath();
      ctx.moveTo(passage[0], passage[1]);
      ctx.lineTo(passage[2], passage[3]);
      ctx.stroke();
    });
    
    // 绘制店铺
    data.shops.forEach(shop => {
      ctx.fillStyle = shop.color;
      ctx.fillRect(shop.x, shop.y, shop.width, shop.height);
      ctx.strokeStyle = '#666';
      ctx.strokeRect(shop.x, shop.y, shop.width, shop.height);
      
      // 店铺编号（简化显示）
      ctx.fillStyle = '#333';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(shop.id, shop.x + shop.width/2, shop.y + shop.height/2);
    });
    
    // 楼层标识
    ctx.fillStyle = '#333';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${data.name}`, 60, 80);
    
    ctx.restore();
  }

  // 检查点击是否在店铺内
  function checkShopClick(x, y) {
    if (currentFloor === 'outdoor') return null;
    
    // 转换坐标（考虑缩放和平移）
    const realX = (x - offsetX) / scale;
    const realY = (y - offsetY) / scale;
    
    return floorData[currentFloor].shops.find(shop => 
      realX >= shop.x && realX <= shop.x + shop.width &&
      realY >= shop.y && realY <= shop.y + shop.height
    );
  }

  // 事件监听：楼层切换
  document.querySelectorAll('.floor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFloor = btn.dataset.floor;
      document.getElementById('currentFloor').textContent = floorData[currentFloor].name;
      document.getElementById('shopInfo').style.display = 'none'; // 隐藏店铺信息
      drawMap();
    });
  });

  // 事件监听：鼠标点击（店铺交互）
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const shop = checkShopClick(x, y);
    if (shop) {
      document.getElementById('shopName').textContent = shop.name;
      document.getElementById('shopId').textContent = shop.id;
      document.getElementById('shopInfo').style.display = 'block';
    } else {
      document.getElementById('shopInfo').style.display = 'none';
    }
  });

  // 事件监听：鼠标拖拽（平移地图）
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    offsetX += x - lastX;
    offsetY += y - lastY;
    lastX = x;
    lastY = y;
    drawMap();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // 事件监听：鼠标滚轮（缩放地图）
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 缩放中心点
    const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
    
    // 调整偏移量，使缩放围绕鼠标位置
    offsetX = mouseX - (mouseX - offsetX) * scaleFactor;
    offsetY = mouseY - (mouseY - offsetY) * scaleFactor;
    
    scale *= scaleFactor;
    // 限制缩放范围
    scale = Math.max(0.5, Math.min(3, scale));
    
    drawMap();
  });

  // 初始化
  document.querySelector(`.floor-btn[data-floor="outdoor"]`).classList.add('active');
  drawMap();
});