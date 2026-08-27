import { runOfficialTests } from "./runner/official-runner";
import { startRunnerWorker } from "./runner/worker-host";

startRunnerWorker(runOfficialTests);
