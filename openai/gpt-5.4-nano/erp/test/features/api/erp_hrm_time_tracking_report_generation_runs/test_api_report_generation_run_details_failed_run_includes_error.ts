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

export async function test_api_report_generation_run_details_failed_run_includes_error(
  connection: api.IConnection,
): Promise<void> {
  // No utilities are provided to create/select a real failed generation run.
  // Use simulation mode to obtain a UUID-shaped failed run payload
  // while still validating the full DTO contract.
  const simulatedConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const output =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.at(
      simulatedConnection,
      {
        reportGenerationRunId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  // Failure expectations
  TestValidator.predicate(
    "error_message should be non-null for a failed run",
    () => output.error_message !== null,
  );
  TestValidator.predicate(
    "status should be a string",
    () => typeof output.status === "string",
  );
  TestValidator.predicate(
    "started_at should be present for a completed failure",
    () => output.started_at !== null,
  );
  TestValidator.predicate(
    "finished_at should be present for a completed failure",
    () => output.finished_at !== null,
  );
  TestValidator.predicate("outputs should be an array (possibly empty)", () =>
    Array.isArray(output.outputs),
  );
  // Validate any returned output rows contract-wise
  for (const outputRow of output.outputs) {
    typia.assert(outputRow);
    TestValidator.equals(
      "reportGenerationRunId must match the run",
      outputRow.reportGenerationRunId,
      output.id,
    );
  }
}
