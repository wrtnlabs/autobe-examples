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

import { generate_random_erp_hrm_time_tracking_report_generation_runs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_generation_runs_create";
import { prepare_random_erp_hrm_time_tracking_report_generation_run } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_generation_run";

export async function test_api_report_generation_run_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create a report generation run in actor-specific context
  const userConnection: api.IConnection = { host: connection.host };
  const created: IErpHrmTimeTrackingReportGenerationRun =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      userConnection,
      {},
    );
  typia.assert(created);
  // 2) Delete the run
  await api.functional.erpHrmTimeTracking.reportGenerationRuns.eraseReportGenerationRun(
    userConnection,
    {
      reportGenerationRunId: created.id,
    },
  );
  // 3) Validate: deleting again should treat it as unavailable/not found
  await TestValidator.error(
    "deleting already deleted run should fail",
    async () => {
      await api.functional.erpHrmTimeTracking.reportGenerationRuns.eraseReportGenerationRun(
        userConnection,
        {
          reportGenerationRunId: created.id,
        },
      );
    },
  );
}
