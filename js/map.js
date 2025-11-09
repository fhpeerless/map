document.addEventListener('DOMContentLoaded', () => {
  // ===== 初始化Three.js核心组件 =====
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -600, 600, 400, -400, // 正交相机（适合2.5D地图）
    0.1, 2000
  );
  camera.position.set(0, 0, 500); // 相机位置（俯视角度）
  camera.lookAt(0, 0, 0);

  // 渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(1200, 800);
  renderer.shadowMap.enabled = true; // 启用阴影
  document.getElementById('mapRenderer').appendChild(renderer.domElement);

  // 轨道控制器（支持缩放、平移、旋转）
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false; // 禁用旋转（保持俯视）
  controls.enableZoom = true; // 启用缩放
  controls.enablePan = true; // 启用平移
  controls.zoomSpeed = 0.5;
  controls.panSpeed = 0.5;

  // 光源（增强3D效果）
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(500, 500, 800);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // ===== 全局状态 =====
  let currentFloor = 'outdoor';
  const floorGroups = {
    outdoor: new THREE.Group(), // 室外场景组
    1: new THREE.Group(),      // 1层场景组
    '-1': new THREE.Group(),   // 负1层场景组
    '-2': new THREE.Group()    // 负2层场景组
  };
  // 将所有楼层组添加到场景
  Object.values(floorGroups).forEach(group => scene.add(group));

  // ===== 数据定义 =====
  // 楼层数据（包含店铺、楼梯、扶梯）
  const floorData = {
    1: {
      shops: generateShops(60, -500, -300, 500, 300, 0), // 店铺（x范围, y范围, z高度）
      stairs: [
        { x: -200, y: 0, width: 40, depth: 40, height: 10 } // 楼梯位置和尺寸
      ],
      escalators: [
        { x: 200, y: 0, width: 50, depth: 60, height: 8 } // 扶梯位置和尺寸
      ]
    },
    '-1': {
      shops: generateShops(60, -500, -300, 500, 300, -100), // z=-100区分楼层
      stairs: [
        { x: -200, y: 0, width: 40, depth: 40, height: 10 }
      ],
      escalators: [
        { x: 200, y: 0, width: 50, depth: 60, height: 8 }
      ]
    },
    '-2': {
      shops: generateShops(60, -500, -300, 500, 300, -200), // z=-200区分楼层
      stairs: [
        { x: -200, y: 0, width: 40, depth: 40, height: 10 }
      ],
      escalators: [
        { x: 200, y: 0, width: 50, depth: 60, height: 8 }
      ]
    }
  };

  // ===== 生成店铺数据 =====
  function generateShops(count, minX, minY, maxX, maxY, z) {
    const shops = [];
    const shopWidth = 40;
    const shopDepth = 30;
    let x = minX + 30;
    let y = minY + 30;

    for (let i = 1; i <= count; i++) {
      shops.push({
        id: `${currentFloor}-${i}`,
        name: `店铺${i}`,
        x,
        y,
        z,
        width: shopWidth,
        depth: shopDepth,
        color: `hsl(${i * 6}, 70%, 60%)`
      });

      x += shopWidth + 10;
      if (x + shopWidth > maxX) {
        x = minX + 30;
        y += shopDepth + 10;
        if (y + shopDepth > maxY) y = minY + 30;
      }
    }
    return shops;
  }

  // ===== 3D模型创建函数 =====
  // 创建3D商场入口（立体门框+门体）
  function createEntrance() {
    const entranceGroup = new THREE.Group();

    // 门框（立方体）
    const frameGeometry = new THREE.BoxGeometry(120, 10, 80); // 宽、高、深
    const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const frameTop = new THREE.Mesh(frameGeometry, frameMaterial);
    frameTop.position.set(0, 50, 0); // 顶部门框
    frameTop.castShadow = true;

    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 100, 80), frameMaterial);
    frameLeft.position.set(-55, 0, 0); // 左侧门框
    frameLeft.castShadow = true;

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(10, 100, 80), frameMaterial);
    frameRight.position.set(55, 0, 0); // 右侧门框
    frameRight.castShadow = true;

    // 门体（半透明玻璃）
    const doorGeometry = new THREE.PlaneGeometry(100, 90);
    const doorMaterial = new THREE.MeshBasicMaterial({
      color: 0xadd8e6,
      transparent: true,
      opacity: 0.7
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0, 1); // 稍微靠前
    door.rotation.y = Math.PI / 2; // 旋转平面朝向

    entranceGroup.add(frameTop, frameLeft, frameRight, door);
    entranceGroup.position.set(0, -200, 0); // 入口位置
    return entranceGroup;
  }

  // 创建楼梯（3D台阶）
  function createStairs(data) {
    const stairsGroup = new THREE.Group();
    const { x, y, width, depth, height } = data;

    // 台阶数量
    const stepCount = 5;
    const stepHeight = height / stepCount;
    const stepDepth = depth / stepCount;

    for (let i = 0; i < stepCount; i++) {
      const stepGeometry = new THREE.BoxGeometry(width, stepHeight, depth - i * stepDepth);
      const stepMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
      const step = new THREE.Mesh(stepGeometry, stepMaterial);
      step.position.set(
        x,
        y + i * stepHeight,
        z + i * stepDepth / 2 // 逐步深入
      );
      step.castShadow = true;
      stairsGroup.add(step);
    }

    return stairsGroup;
  }

  // 创建扶梯（倾斜台阶+扶手）
  function createEscalator(data) {
    const escalatorGroup = new THREE.Group();
    const { x, y, width, depth, height } = data;

    // 扶梯台阶（倾斜）
    const stepCount = 8;
    const stepHeight = height / stepCount;
    const stepDepth = depth / stepCount;

    for (let i = 0; i < stepCount; i++) {
      const stepGeometry = new THREE.BoxGeometry(width, stepHeight, stepDepth * 0.8);
      const stepMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
      const step = new THREE.Mesh(stepGeometry, stepMaterial);
      step.position.set(
        x,
        y + i * stepHeight,
        z + i * stepDepth
      );
      step.castShadow = true;
      escalatorGroup.add(step);
    }

    // 扶手
    const handrailGeometry = new THREE.BoxGeometry(5, height + 10, depth);
    const handrailMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const handrailLeft = new THREE.Mesh(handrailGeometry, handrailMaterial);
    handrailLeft.position.set(x - width/2 - 5, y + height/2, z + depth/2);
    const handrailRight = new THREE.Mesh(handrailGeometry, handrailMaterial);
    handrailRight.position.set(x + width/2 + 5, y + height/2, z + depth/2);
    escalatorGroup.add(handrailLeft, handrailRight);

    return escalatorGroup;
  }

  // 创建店铺（2.5D平面+边框）
  function createShop(shop) {
    const shopGroup = new THREE.Group();

    // 店铺地面
    const shopGeometry = new THREE.BoxGeometry(shop.width, 1, shop.depth);
    const shopMaterial = new THREE.MeshPhongMaterial({ color: shop.color });
    const shopBase = new THREE.Mesh(shopGeometry, shopMaterial);
    shopBase.position.set(shop.x, shop.y, shop.z);
    shopBase.receiveShadow = true;

    // 店铺边框（增强立体感）
    const borderGeometry = new THREE.BoxGeometry(shop.width + 2, 3, shop.depth + 2);
    const borderMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.set(shop.x, shop.y, shop.z - 1); // 稍微靠下
    shopGroup.add(border, shopBase);

    // 存储店铺数据（用于点击交互）
    shopGroup.userData = { type: 'shop', ...shop };
    return shopGroup;
  }

  // 创建楼层地面
  function createFloor(z, color) {
    const floorGeometry = new THREE.PlaneGeometry(1200, 800);
    const floorMaterial = new THREE.MeshPhongMaterial({ color, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2; // 旋转为水平面
    floor.position.z = z;
    floor.receiveShadow = true;
    return floor;
  }

  // ===== 初始化场景 =====
  function initScenes() {
    // 1. 室外场景
    const outdoorFloor = createFloor(0, 0xe0f7fa); // 室外地面
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 100),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, side: THREE.DoubleSide })
    );
    road.rotation.x = Math.PI / 2;
    road.position.set(0, 0, 1); // 略高于地面
    const entrance = createEntrance(); // 3D入口
    floorGroups.outdoor.add(outdoorFloor, road, entrance);

    // 2. 室内楼层（1层/-1层/-2层）
    Object.keys(floorData).forEach(floor => {
      const z = parseInt(floor) === 1 ? 0 : parseInt(floor) * 100; // 楼层高度区分
      const floorMesh = createFloor(z, 0xf9f9f9); // 室内地面
      floorGroups[floor].add(floorMesh);

      // 添加店铺
      floorData[floor].shops.forEach(shop => {
        floorGroups[floor].add(createShop(shop));
      });

      // 添加楼梯
      floorData[floor].stairs.forEach(stair => {
        const stairMesh = createStairs({ ...stair, z });
        floorGroups[floor].add(stairMesh);
      });

      // 添加扶梯
      floorData[floor].escalators.forEach(escalator => {
        const escalatorMesh = createEscalator({ ...escalator, z });
        floorGroups[floor].add(escalatorMesh);
      });
    });

    // 默认隐藏非室外楼层
    Object.keys(floorGroups).forEach(floor => {
      floorGroups[floor].visible = floor === floor === 'outdoor';
    });
  }

  // ===== 交互逻辑 =====
  // 楼层切换
  document.querySelectorAll('.floor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const floor = btn.dataset.floor;
      currentFloor = floor;
      // 显示当前楼层，隐藏其他楼层
      Object.keys(floorGroups).forEach((group, key) => {
        group.visible = key === floor;
      });
      // 更新信息面板
      document.getElementById('currentFloor').textContent = 
        floor === 'outdoor' ? '室外' : `${floor}层`;
      document.getElementById('shopInfo').style.display = 'none';
      // 高亮按钮
      document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 点击店铺交互（射线检测）
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onMouseClick(event) {
    // 计算鼠标在标准化设备坐标中的位置
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 更新射线投射器
    raycaster.setFromCamera(mouse, camera);
    // 检测与所有物体的交集
    const intersects = raycaster.intersectObjects(floorGroups[currentFloor].children, true);

    if (intersects.length > 0) {
      const target = intersects[0].object;
      if (target.parent?.userData?.type === 'shop') {
        const shop = target.parent.userData;
        document.getElementById('shopName').textContent = shop.name;
        document.getElementById('shopId').textContent = shop.id;
        document.getElementById('shopInfo').style.display = 'block';
      } else {
        document.getElementById('shopInfo').style.display = 'none';
      }
    }
  }

  // 绑定点击事件
  renderer.domElement.addEventListener('click', onMouseClick);

  // ===== 动画循环 =====
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  // ===== 初始化 =====
  initScenes();
  animate();
  document.querySelector('.floor-btn[data-floor="outdoor"]').classList.add('active');
});
