// 采用ES Modules方式导入Three.js核心和控制器
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.addEventListener('DOMContentLoaded', () => {
    // ===== 初始化Three.js核心组件 =====
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // 正交相机
    const camera = new THREE.OrthographicCamera(
        -800, 800, 500, -500,
        0.1, 5000
    );
    camera.position.set(600, 600, 800);
    camera.lookAt(0, 0, 100);

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1200, 800);
    renderer.shadowMap.enabled = true;
    document.getElementById('mapRenderer').appendChild(renderer.domElement);

    // 修正OrbitControls使用方式（直接使用导入的OrbitControls）
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.zoomSpeed = 0.5;
    controls.panSpeed = 0.5;

    // 光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1000, 500, 1000);
    directionalLight1.castShadow = true;
    scene.add(directionalLight1);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-1000, -500, 800);
    scene.add(directionalLight2);

    // ===== 全局状态 =====
    let currentFloor = 'outdoor';
    const floorGroups = {
        outdoor: new THREE.Group(),
        1: new THREE.Group(),
        '-1': new THREE.Group(),
        '-2': new THREE.Group(),
        '-3': new THREE.Group()
    };
    Object.values(floorGroups).forEach(group => scene.add(group));

    // ===== 创建鸟巢式立体图形 =====
    function createBirdNest() {
        const nestGroup = new THREE.Group();
        nestGroup.position.set(0, 0, 150);

        // 鸟巢参数
        const radius = 180;
        const height = 120;
        const rings = 18;
        const segmentsPerRing = 36;
        const curveCount = 24;
        const tubeRadius = 5;

        // 1. 水平环
        for (let r = 0; r < rings; r++) {
            const ringRadius = radius * (0.5 + 0.5 * Math.cos((r / rings) * Math.PI));
            const zPos = (r / (rings - 1)) * height - height / 2;

            const ringCurve = new THREE.EllipseCurve(0, 0, ringRadius, ringRadius, 0, 2 * Math.PI);
            const points = ringCurve.getPoints(segmentsPerRing);
            const tubeGeometry = new THREE.TubeGeometry(
                new THREE.CatmullRomCurve3(points),
                segmentsPerRing * 2,
                tubeRadius,
                12
            );
            const material = new THREE.MeshPhongMaterial({
                color: 0x888888,
                metalness: 0.8,
                roughness: 0.3
            });
            const ring = new THREE.Mesh(tubeGeometry, material);
            ring.position.z = zPos;
            ring.castShadow = true;
            nestGroup.add(ring);
        }

        // 2. 交叉曲线
        for (let c = 0; c < curveCount; c++) {
            const angle = (c / curveCount) * 2 * Math.PI;
            const points = [];
            for (let r = 0; r < rings; r++) {
                const ringRadius = radius * (0.5 + 0.5 * Math.cos((r / rings) * Math.PI));
                const zPos = (r / (rings - 1)) * height - height / 2;
                const randomOffset = (Math.random() - 0.5) * radius * 0.2;
                const x = Math.cos(angle) * (ringRadius + randomOffset);
                const y = Math.sin(angle) * (ringRadius + randomOffset);
                points.push(new THREE.Vector3(x, y, zPos));
            }
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeometry = new THREE.TubeGeometry(
                curve,
                rings * 3,
                tubeRadius * 0.8,
                12
            );
            const material = new THREE.MeshPhongMaterial({
                color: 0x666666,
                metalness: 0.8,
                roughness: 0.3
            });
            const crossBar = new THREE.Mesh(tubeGeometry, material);
            crossBar.castShadow = true;
            nestGroup.add(crossBar);
        }

        // 3. 底部基座
        const baseGeometry = new THREE.CylinderGeometry(radius * 1.2, radius * 1.4, 20, 64);
        const baseMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.z = -height / 2 - 10;
        base.receiveShadow = true;
        nestGroup.add(base);

        nestGroup.userData.isRotating = true;
        return nestGroup;
    }

    // ===== 初始化场景 =====
// 修改initScenes函数，添加建筑物
    function initScenes() {
        // 室外场景（鸟巢）
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(3000, 3000),
            new THREE.MeshPhongMaterial({ color: 0x8fbc8f })
        );
        ground.rotation.x = Math.PI / 2;
        ground.position.z = -10;
        ground.receiveShadow = true;

        const birdNest = createBirdNest();
        // 添加圆柱形建筑物
        const building = createCylindricalBuilding();

        // 将建筑物添加到室外场景
        floorGroups.outdoor.add(ground, birdNest, building);

        // 室内楼层
        const floorColors = { 1: 0xf0f0f0, '-1': 0xe8e8e8, '-2': 0xe0e0e0, '-3': 0xd8d8d8 };
        Object.keys(floorGroups).forEach(floor => {
            if (floor === 'outdoor') return;
            const z = parseInt(floor) === 1 ? 0 : parseInt(floor) * 100;
            const floorMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(1200, 800),
                new THREE.MeshPhongMaterial({ color: floorColors[floor], side: THREE.DoubleSide })
            );
            floorMesh.rotation.x = Math.PI / 2;
            floorMesh.position.z = z;
            floorGroups[floor].add(floorMesh);
        });

        // 默认显示室外
        Object.keys(floorGroups).forEach(floor => {
            floorGroups[floor].visible = floor === 'outdoor';
        });
    }

    // ===== 楼层切换 =====
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const floor = btn.dataset.floor;
            currentFloor = floor;
            Object.keys(floorGroups).forEach(key => {
                floorGroups[key].visible = key === floor;
            });
            document.getElementById('currentFloor').textContent =
                floor === 'outdoor' ? '室外' : `${floor}层`;
            document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ===== 动画循环 =====
    function animate() {
        requestAnimationFrame(animate);
        // 鸟巢旋转
        floorGroups.outdoor.children.forEach(child => {
            if (child.userData?.isRotating) {
                child.rotation.y += 0.001;
            }
        });
        renderer.render(scene, camera);
    }

    // 初始化
    initScenes();
    animate();
    document.querySelector('.floor-btn[data-floor="outdoor"]').classList.add('active');
});

// 在map.js中添加以下函数来创建圆柱形建筑物
function createCylindricalBuilding() {
    const buildingGroup = new THREE.Group();

    // 建筑物主体
    const mainGeometry = new THREE.CylinderGeometry(50, 60, 200, 32);
    const mainMaterial = new THREE.MeshStandardMaterial({
        color: 0x3498db,
        metalness: 0.2,
        roughness: 0.8
    });
    const mainCylinder = new THREE.Mesh(mainGeometry, mainMaterial);
    mainCylinder.position.y = 100; // 让底部与地面对齐
    mainCylinder.castShadow = true;
    mainCylinder.receiveShadow = true;
    buildingGroup.add(mainCylinder);

    // 建筑细节 - 横向装饰线条
    for (let i = 0; i < 5; i++) {
        const ringGeometry = new THREE.RingGeometry(50, 62, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x2980b9,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 30 + i * 40;
        ring.castShadow = true;
        buildingGroup.add(ring);
    }

    // 建筑顶部
    const topGeometry = new THREE.CylinderGeometry(60, 65, 20, 32);
    const topMaterial = new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        metalness: 0.3,
        roughness: 0.7
    });
    const topCylinder = new THREE.Mesh(topGeometry, topMaterial);
    topCylinder.position.y = 210;
    topCylinder.castShadow = true;
    buildingGroup.add(topCylinder);

    // 建筑底部基座
    const baseGeometry = new THREE.CylinderGeometry(70, 75, 10, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x95a5a6,
        metalness: 0.1,
        roughness: 0.9
    });
    const baseCylinder = new THREE.Mesh(baseGeometry, baseMaterial);
    baseCylinder.position.y = 5;
    baseCylinder.receiveShadow = true;
    buildingGroup.add(baseCylinder);

    // 放置建筑物位置（在鸟巢旁边）
    buildingGroup.position.set(300, 200, 0);

    return buildingGroup;
}
