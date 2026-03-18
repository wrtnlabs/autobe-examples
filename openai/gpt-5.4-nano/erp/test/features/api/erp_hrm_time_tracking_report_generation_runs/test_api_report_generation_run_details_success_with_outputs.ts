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

export async function test_api_report_generation_run_details_success_with_outputs(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  // This endpoint requires an existing successful run with outputs.
  // Since no utility functions are provided, we must rely on backend seeded data.
  // Use a deterministic UUID to target a run known to exist in the test environment.
  // If the environment has different seed data, this test will fail and should be adapted
  // to use available list/search APIs (not provided in the current SDK inputs).
  const reportGenerationRunId =
    "00000000-0000-0000-0000-000000000001" as string &
      import("typia").tags.Format<"uuid">;
  const output =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.at(
      actorConnection,
      {
        reportGenerationRunId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "run id matches request",
    output.id,
    reportGenerationRunId,
  );
  TestValidator.predicate(
    "run status should indicate success",
    output.status.toLowerCase().includes("success") ||
      output.status.toLowerCase().includes("completed") ||
      output.status.toLowerCase().includes("done"),
  );
  TestValidator.equals("run error_message is null", output.error_message, null);
  TestValidator.equals("run deleted_at is null", output.deleted_at, null);
  TestValidator.predicate(
    "run started_at should be present",
    output.started_at !== null,
  );
  TestValidator.predicate(
    "run finished_at should be present",
    output.finished_at !== null,
  );
  TestValidator.equals(
    "outputs is an array",
    Array.isArray(output.outputs),
    true,
  );
  for (const o of output.outputs) {
    typia.assert(o);
    TestValidator.equals(
      "output scoped to run",
      o.reportGenerationRunId,
      reportGenerationRunId,
    );
    TestValidator.equals("output deletedAt is null", o.deletedAt, null);
    TestValidator.equals(
      "output has groupingSortKey",
      typeof o.groupingSortKey === "string",
      true,
    );
    TestValidator.predicate(
      "output notes is null or string",
      o.notes === null || typeof o.notes === "string",
    );
    if (o.taskId === null) {
      TestValidator.equals("task is null when taskId is null", o.task, null);
    } else {
      TestValidator.predicate(
        "task is not null when taskId is uuid",
        o.task !== null,
      );
    }
    if (o.weekStartDateId === null) {
      TestValidator.equals(
        "weekStartDate is null when weekStartDateId is null",
        o.weekStartDate,
        null,
      );
    } else {
      TestValidator.predicate(
        "weekStartDate is not null when weekStartDateId is uuid",
        o.weekStartDate !== null,
      );
    }
    TestValidator.predicate(
      "employee summary is present",
      o.employee !== null && typeof o.employee === "object",
    );
    TestValidator.predicate(
      "project summary is present",
      o.project !== null && typeof o.project === "object",
    );
    TestValidator.equals("output id exists", typeof o.id === "string", true);
    TestValidator.equals(
      "output createdAt is date-time string",
      typeof o.createdAt === "string",
      true,
    );
    TestValidator.equals(
      "output updatedAt is date-time string",
      typeof o.updatedAt === "string",
      true,
    );
  }
}
