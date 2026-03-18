import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import type { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import type { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import type { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { generate_random_hrm_time_tracking_reports_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_reports_snapshots_create";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_report_snapshot";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_snapshot_current_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const report: IHrmTimeTrackingReport =
    await generate_random_hrm_time_tracking_reports_create(userConnection, {
      body: {
        name: `report-${RandomGenerator.alphaNumeric(8)}`,
        reportType: RandomGenerator.pick([
          "time_report",
          "project_budget_report",
          "weekly_summary_report",
        ] as const),
        rangeStartDate: new Date("2026-01-01T00:00:00.000Z").toISOString(),
        rangeEndDate: new Date("2026-01-31T23:59:59.000Z").toISOString(),
        groupBy: null,
        billableOnly: null,
        includeNonBillable: null,
      },
    });
  typia.assert(report);
  const inaccessibleReportId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "out-of-scope report id must differ from created report id",
    inaccessibleReportId,
    report.id,
  );
  const snapshotBody = {
    output_uri: `https://example.com/artifacts/${RandomGenerator.alphaNumeric(12)}.csv`,
    output_format: "csv",
    period_start: new Date("2026-02-01T00:00:00.000Z").toISOString(),
    period_end: new Date("2026-02-28T23:59:59.000Z").toISOString(),
    row_count: 0,
    generated_at: new Date("2026-03-01T00:00:00.000Z").toISOString(),
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  await TestValidator.httpError(
    "snapshot creation rejects inaccessible report outside current organization scope",
    [403, 404],
    async () => {
      await generate_random_hrm_time_tracking_reports_snapshots_create(
        userConnection,
        {
          params: {
            reportId: inaccessibleReportId,
          },
          body: snapshotBody,
        },
      );
    },
  );
}
