import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import type { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import type { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
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

export async function test_api_report_employee_filters_replace_selection_set(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const created = await generate_random_hrm_time_tracking_reports_create(
    userConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphaNumeric(8)}`,
        reportType: "time_report",
        rangeStartDate: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        rangeEndDate: new Date("2024-01-31T23:59:59.999Z").toISOString(),
        groupBy: "employee",
        billableOnly: true,
        includeNonBillable: false,
      },
    },
  );
  typia.assert(created);
  const beforeSnapshot = {
    id: created.id,
    organization: created.organization,
    reportType: created.reportType,
    rangeStartDate: created.rangeStartDate,
    rangeEndDate: created.rangeEndDate,
    groupBy: created.groupBy,
    billableOnly: created.billableOnly,
    includeNonBillable: created.includeNonBillable,
    projectFilters: created.projectFilters,
    taskFilters: created.taskFilters,
    updatedAt: created.updatedAt,
    employeeIds: created.reportEmployeeFilters.map(
      (filter) => filter.employee.id,
    ),
  };
  const distinctBeforeEmployeeIds = [...new Set(beforeSnapshot.employeeIds)];
  const replacementEmployeeIds =
    distinctBeforeEmployeeIds.length > 1
      ? distinctBeforeEmployeeIds.slice(0, distinctBeforeEmployeeIds.length - 1)
      : [];
  const removedEmployeeIds = distinctBeforeEmployeeIds.filter(
    (id) => replacementEmployeeIds.includes(id) === false,
  );
  const patched =
    await api.functional.hrmTimeTracking.reports.employeeFilters.patchByReportid(
      userConnection,
      {
        reportId: created.id,
        body: {
          employeeIds: replacementEmployeeIds,
        } satisfies IHrmTimeTrackingReport.IUpdateEmployeeFilter,
      },
    );
  typia.assert(patched);
  const patchedEmployeeIds = patched.reportEmployeeFilters.map(
    (filter) => filter.employee.id,
  );
  const distinctPatchedEmployeeIds = [...new Set(patchedEmployeeIds)];
  TestValidator.equals("report id unchanged", patched.id, beforeSnapshot.id);
  TestValidator.equals(
    "organization unchanged",
    patched.organization,
    beforeSnapshot.organization,
  );
  TestValidator.equals(
    "report type unchanged",
    patched.reportType,
    beforeSnapshot.reportType,
  );
  TestValidator.equals(
    "range start date unchanged",
    patched.rangeStartDate,
    beforeSnapshot.rangeStartDate,
  );
  TestValidator.equals(
    "range end date unchanged",
    patched.rangeEndDate,
    beforeSnapshot.rangeEndDate,
  );
  TestValidator.equals(
    "group by unchanged",
    patched.groupBy,
    beforeSnapshot.groupBy,
  );
  TestValidator.equals(
    "billable only unchanged",
    patched.billableOnly,
    beforeSnapshot.billableOnly,
  );
  TestValidator.equals(
    "include non billable unchanged",
    patched.includeNonBillable,
    beforeSnapshot.includeNonBillable,
  );
  TestValidator.equals(
    "project filters unchanged",
    patched.projectFilters,
    beforeSnapshot.projectFilters,
  );
  TestValidator.equals(
    "task filters unchanged",
    patched.taskFilters,
    beforeSnapshot.taskFilters,
  );
  TestValidator.notEquals(
    "parent updatedAt changed",
    patched.updatedAt,
    beforeSnapshot.updatedAt,
  );
  TestValidator.equals(
    "employee filter count equals replacement request",
    patched.reportEmployeeFilters.length,
    replacementEmployeeIds.length,
  );
  TestValidator.equals(
    "employee ids exactly match replacement request",
    [...distinctPatchedEmployeeIds].sort(),
    [...replacementEmployeeIds].sort(),
  );
  TestValidator.equals(
    "each selected employee appears only once",
    distinctPatchedEmployeeIds.length,
    patchedEmployeeIds.length,
  );
  TestValidator.predicate(
    "all employee filter rows point to patched report",
    patched.reportEmployeeFilters.every(
      (filter) => filter.report.id === patched.id,
    ),
  );
  TestValidator.predicate(
    "no leftover prior selections remain",
    removedEmployeeIds.every((id) => patchedEmployeeIds.includes(id) === false),
  );
}
