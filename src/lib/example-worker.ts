import { runExamples } from "./runner/example-runner";
import { startRunnerWorker } from "./runner/worker-host";

startRunnerWorker(runExamples);
