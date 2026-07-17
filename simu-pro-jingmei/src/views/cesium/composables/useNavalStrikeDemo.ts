import { ref, type Ref } from "vue";
import * as Cesium from "cesium";

type DemoEntity = Cesium.Entity | undefined;

type SavedClockState = {
  startTime: Cesium.JulianDate;
  stopTime: Cesium.JulianDate;
  currentTime: Cesium.JulianDate;
  clockRange: Cesium.ClockRange;
  multiplier: number;
  shouldAnimate: boolean;
};

const DEMO_DURATION_SECONDS = 70;

const MODEL_URLS = {
  warship: "/models/warship.glb",
  missile: "/models/missile.glb",
};

const SCENE = {
  camera: {
    lon: -122.382,
    lat: 37.805,
    height: 7200,
    heading: 58,
    pitch: -37,
    roll: 0,
  },
  shipRoute: [
    { lon: -122.335, lat: 37.790, alt: 8, seconds: 0 },
    { lon: -122.382, lat: 37.807, alt: 8, seconds: 35 },
    { lon: -122.43, lat: 37.824, alt: 8, seconds: DEMO_DURATION_SECONDS },
  ],
  missileRoute: [
    { lon: -122.245, lat: 37.758, alt: 820, seconds: 0 },
    { lon: -122.315, lat: 37.784, alt: 620, seconds: 18 },
    { lon: -122.368, lat: 37.804, alt: 430, seconds: 38 },
    { lon: -122.397, lat: 37.813, alt: 300, seconds: DEMO_DURATION_SECONDS },
  ],
};

const toCartesian = (point: { lon: number; lat: number; alt: number }) =>
  Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.alt);

const buildPositionProperty = (
  startTime: Cesium.JulianDate,
  route: Array<{ lon: number; lat: number; alt: number; seconds: number }>
) => {
  const position = new Cesium.SampledPositionProperty();
  route.forEach((point) => {
    position.addSample(
      Cesium.JulianDate.addSeconds(startTime, point.seconds, new Cesium.JulianDate()),
      toCartesian(point)
    );
  });
  position.setInterpolationOptions({
    interpolationDegree: 2,
    interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
  });
  return position;
};

const saveClockState = (clock: Cesium.Clock): SavedClockState => ({
  startTime: Cesium.JulianDate.clone(clock.startTime),
  stopTime: Cesium.JulianDate.clone(clock.stopTime),
  currentTime: Cesium.JulianDate.clone(clock.currentTime),
  clockRange: clock.clockRange,
  multiplier: clock.multiplier,
  shouldAnimate: clock.shouldAnimate,
});

const restoreClockState = (clock: Cesium.Clock, savedState: SavedClockState | null) => {
  if (!savedState) return;

  clock.startTime = Cesium.JulianDate.clone(savedState.startTime);
  clock.stopTime = Cesium.JulianDate.clone(savedState.stopTime);
  clock.currentTime = Cesium.JulianDate.clone(savedState.currentTime);
  clock.clockRange = savedState.clockRange;
  clock.multiplier = savedState.multiplier;
  clock.shouldAnimate = savedState.shouldAnimate;
};

export default function useNavalStrikeDemo(viewerRef: Ref<Cesium.Viewer | null>) {
  const isActive = ref(false);
  const demoEntities = new Set<DemoEntity>();
  let savedClockState: SavedClockState | null = null;

  const clearEntities = () => {
    const viewer = viewerRef.value;
    if (!viewer) return;

    demoEntities.forEach((entity) => {
      if (entity) viewer.entities.remove(entity);
    });
    demoEntities.clear();
    viewer.trackedEntity = undefined;
  };

  const stop = () => {
    const viewer = viewerRef.value;
    if (!viewer) return;

    clearEntities();
    restoreClockState(viewer.clock, savedClockState);
    savedClockState = null;
    isActive.value = false;
    viewer.scene.requestRender();
  };

  const start = () => {
    const viewer = viewerRef.value;
    if (!viewer) return;

    if (isActive.value) {
      stop();
    }

    const startTime = Cesium.JulianDate.now();
    const stopTime = Cesium.JulianDate.addSeconds(
      startTime,
      DEMO_DURATION_SECONDS,
      new Cesium.JulianDate()
    );

    savedClockState = saveClockState(viewer.clock);

    const shipPosition = buildPositionProperty(startTime, SCENE.shipRoute);
    const missilePosition = buildPositionProperty(startTime, SCENE.missileRoute);

    viewer.clock.startTime = Cesium.JulianDate.clone(startTime);
    viewer.clock.stopTime = Cesium.JulianDate.clone(stopTime);
    viewer.clock.currentTime = Cesium.JulianDate.clone(startTime);
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 1;
    viewer.clock.shouldAnimate = true;

    const ship = viewer.entities.add({
      id: "naval-strike-demo-warship",
      name: "海上移动目标",
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({ start: startTime, stop: stopTime }),
      ]),
      position: shipPosition,
      orientation: new Cesium.VelocityOrientationProperty(shipPosition),
      model: {
        uri: MODEL_URLS.warship,
        minimumPixelSize: 220,
        maximumScale: 680,
        scale: 3.2,
        runAnimations: true,
        heightReference: Cesium.HeightReference.NONE,
      },
    });

    const missile = viewer.entities.add({
      id: "naval-strike-demo-missile",
      name: "空中飞行导弹",
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({ start: startTime, stop: stopTime }),
      ]),
      position: missilePosition,
      orientation: new Cesium.VelocityOrientationProperty(missilePosition),
      model: {
        uri: MODEL_URLS.missile,
        minimumPixelSize: 70,
        maximumScale: 180,
        scale: 1,
        runAnimations: true,
      },
    });

    demoEntities.add(ship);
    demoEntities.add(missile);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        SCENE.camera.lon,
        SCENE.camera.lat,
        SCENE.camera.height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(SCENE.camera.heading),
        pitch: Cesium.Math.toRadians(SCENE.camera.pitch),
        roll: Cesium.Math.toRadians(SCENE.camera.roll),
      },
      duration: 2,
    });

    isActive.value = true;
    viewer.scene.requestRender();
  };

  const replay = () => {
    start();
  };

  const destroy = () => {
    stop();
  };

  return {
    isActive,
    start,
    stop,
    replay,
    destroy,
  };
}
