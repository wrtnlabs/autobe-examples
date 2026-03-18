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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_snapshot_history_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  const reportOwnerConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
  };
  const report = await generate_random_hrm_time_tracking_reports_create(
    reportOwnerConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
        rangeStartDate: new Date(
          Date.now() - 1000 * 60 * 60 * 24,
        ).toISOString(),
        rangeEndDate: new Date().toISOString(),
        groupBy: "employee",
        billableOnly: false,
        includeNonBillable: true,
      },
    },
  );
  typia.assert(report);
  const request = {
    outputFormat: "csv",
    generatedAtFrom: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    generatedAtTo: new Date().toISOString(),
    periodStartFrom: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    periodStartTo: new Date().toISOString(),
    periodEndFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    periodEndTo: new Date().toISOString(),
    rowCountMin: 0,
    rowCountMax: 100,
    sort: "generatedAt",
    direction: "desc",
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingReportSnapshot.IRequest;
  await TestValidator.error("snapshot history permission denied", async () => {
    await api.functional.hrmTimeTracking.reports.snapshots.index(
      unauthorizedConnection,
      {
        reportId: report.id,
        body: request,
      },
    );
  });
}
