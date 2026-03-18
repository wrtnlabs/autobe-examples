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

export async function test_api_report_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const createdReport = await generate_random_hrm_time_tracking_reports_create(
    actorConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
        rangeStartDate: null,
        rangeEndDate: null,
        groupBy: null,
        billableOnly: null,
        includeNonBillable: null,
      },
    },
  );
  typia.assert(createdReport);
  const reportSnapshotBeforeBrowse = {
    id: createdReport.id,
    organization: createdReport.organization,
    name: createdReport.name,
    reportType: createdReport.reportType,
    rangeStartDate: createdReport.rangeStartDate,
    rangeEndDate: createdReport.rangeEndDate,
    groupBy: createdReport.groupBy,
    billableOnly: createdReport.billableOnly,
    includeNonBillable: createdReport.includeNonBillable,
    reportEmployeeFilters: createdReport.reportEmployeeFilters,
    projectFilters: createdReport.projectFilters,
    taskFilters: createdReport.taskFilters,
    createdAt: createdReport.createdAt,
    updatedAt: createdReport.updatedAt,
    deletedAt: createdReport.deletedAt,
  } satisfies IHrmTimeTrackingReport;
  const request = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingReportSnapshot.IRequest;
  const history = await api.functional.hrmTimeTracking.reports.snapshots.index(
    actorConnection,
    {
      reportId: createdReport.id,
      body: request,
    },
  );
  typia.assert(history);
  TestValidator.equals(
    "pagination current page",
    history.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", history.pagination.limit, 10);
  TestValidator.predicate(
    "pagination record count is non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    history.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    history.data.length <= history.pagination.limit,
  );
  TestValidator.predicate(
    "empty result set has pagination object",
    history.pagination.current >= 0 &&
      history.pagination.limit >= 0 &&
      history.pagination.records >= 0 &&
      history.pagination.pages >= 0,
  );
  const reportSnapshotAfterBrowse = {
    id: createdReport.id,
    organization: createdReport.organization,
    name: createdReport.name,
    reportType: createdReport.reportType,
    rangeStartDate: createdReport.rangeStartDate,
    rangeEndDate: createdReport.rangeEndDate,
    groupBy: createdReport.groupBy,
    billableOnly: createdReport.billableOnly,
    includeNonBillable: createdReport.includeNonBillable,
    reportEmployeeFilters: createdReport.reportEmployeeFilters,
    projectFilters: createdReport.projectFilters,
    taskFilters: createdReport.taskFilters,
    createdAt: createdReport.createdAt,
    updatedAt: createdReport.updatedAt,
    deletedAt: createdReport.deletedAt,
  } satisfies IHrmTimeTrackingReport;
  TestValidator.equals(
    "browsing snapshots does not mutate parent report",
    reportSnapshotAfterBrowse,
    reportSnapshotBeforeBrowse,
  );
  for (const snapshot of history.data) {
    const summaryOnly = {
      id: snapshot.id,
      output_uri: snapshot.output_uri,
      output_format: snapshot.output_format,
      period_start: snapshot.period_start,
      period_end: snapshot.period_end,
      row_count: snapshot.row_count,
      generated_at: snapshot.generated_at,
      created_at: snapshot.created_at,
      updated_at: snapshot.updated_at,
    } satisfies IHrmTimeTrackingReportSnapshot.ISummary;
    TestValidator.equals(
      "snapshot exposes summary metadata only",
      summaryOnly,
      snapshot,
    );
  }
}
