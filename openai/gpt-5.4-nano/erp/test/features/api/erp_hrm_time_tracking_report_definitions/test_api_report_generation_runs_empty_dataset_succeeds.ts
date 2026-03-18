import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import type { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import type { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_generation_runs_empty_dataset_succeeds(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  // 1) Create a report definition (use generator utility to ensure server-acceptable configuration)
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      userConnection,
      {},
    );
  typia.assert(reportDefinition);
  // 2) Trigger generation run with a future window to target empty dataset
  const futureFrom = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2);
  const futureTo = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2 + 1000);
  const run =
    await api.functional.erpHrmTimeTracking.reportDefinitions.reportGenerationRuns.search(
      userConnection,
      {
        reportDefinitionId: reportDefinition.id,
        body: {
          create: true,
          parametersSummary: "empty-dataset-future-window",
          createdAtFrom: futureFrom.toISOString(),
          createdAtTo: futureTo.toISOString(),
        } satisfies IErpHrmTimeTrackingReportGenerationRun.IRequest,
      },
    );
  typia.assert(run);
  // 3) Validate response indicates success even when no timelog data matches
  TestValidator.equals("error_message is null", run.error_message, null);
  TestValidator.predicate(
    "started_at should not be null",
    () => run.started_at !== null,
  );
  TestValidator.predicate(
    "finished_at should not be null",
    () => run.finished_at !== null,
  );
  if (run.started_at !== null && run.finished_at !== null) {
    TestValidator.predicate(
      "finished_at should be >= started_at",
      () =>
        new Date(run.finished_at as string).getTime() >=
        new Date(run.started_at as string).getTime(),
    );
  }
  TestValidator.predicate(
    "status should not indicate failure",
    () => !/fail|error/i.test(run.status),
  );
}
