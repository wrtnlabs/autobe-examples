import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import type { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import type { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_generation_run_details_empty_outputs(
  connection: api.IConnection,
): Promise<void> {
  // Connection isolation: base connection only
  const memberConnection: api.IConnection = { host: connection.host };
  // Select a UUID for the generation run.
  const reportGenerationRunId = typia.random<string & tags.Format<"uuid">>();
  const run = await api.functional.erpHrmTimeTracking.reportGenerationRuns.at(
    memberConnection,
    {
      reportGenerationRunId,
    },
  );
  typia.assert(run);
  // Validate empty outputs array
  TestValidator.equals(
    "outputs should be an empty array",
    run.outputs.length,
    0,
  );
  // Validate that run timestamps/soft-delete fields are present (types validated by typia.assert)
  TestValidator.predicate(
    "started_at should be null or defined",
    () => run.started_at === null || typeof run.started_at === "string",
  );
  TestValidator.predicate(
    "finished_at should be null or defined",
    () => run.finished_at === null || typeof run.finished_at === "string",
  );
  TestValidator.predicate(
    "deleted_at should be null or defined",
    () => run.deleted_at === null || typeof run.deleted_at === "string",
  );
  // Confirm read-only behavior: metadata should remain stable across repeated reads.
  const run2 = await api.functional.erpHrmTimeTracking.reportGenerationRuns.at(
    memberConnection,
    {
      reportGenerationRunId,
    },
  );
  typia.assert(run2);
  TestValidator.equals("id should be stable", run2.id, run.id);
  TestValidator.equals("status should be stable", run2.status, run.status);
  TestValidator.equals(
    "parameters_summary should be stable",
    run2.parameters_summary,
    run.parameters_summary,
  );
}
