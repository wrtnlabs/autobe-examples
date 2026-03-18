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
import { generate_random_hrm_time_tracking_reports_employee_filters_create } from "../../../generate/generate_random_hrm_time_tracking_reports_employee_filters_create";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_employee_filter_delete_out_of_scope_access_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const attackerConnection: api.IConnection = { host: connection.host };
  const report = await generate_random_hrm_time_tracking_reports_create(
    ownerConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
      },
    },
  );
  typia.assert(report);
  const employeeFilter =
    await generate_random_hrm_time_tracking_reports_employee_filters_create(
      ownerConnection,
      {
        params: {
          reportId: report.id,
        },
      },
    );
  typia.assert(employeeFilter);
  const reportId = report.id;
  const reportName = report.name;
  const reportType = report.reportType;
  const organizationId = report.organization.id;
  const organizationName = report.organization.name;
  const employeeFilterId = employeeFilter.id;
  const filterReportId = employeeFilter.report.id;
  const filterEmployeeId = employeeFilter.employee.id;
  const filterEmployeeEmail = employeeFilter.employee.email;
  TestValidator.equals(
    "filter belongs to created report",
    filterReportId,
    reportId,
  );
  TestValidator.equals(
    "filter report summary name matches parent report",
    employeeFilter.report.name,
    reportName,
  );
  TestValidator.equals(
    "filter report summary type matches parent report",
    employeeFilter.report.report_type,
    reportType,
  );
  TestValidator.equals(
    "filter report date start matches parent report",
    employeeFilter.report.range_start_date,
    report.rangeStartDate,
  );
  TestValidator.equals(
    "filter report date end matches parent report",
    employeeFilter.report.range_end_date,
    report.rangeEndDate,
  );
  TestValidator.equals(
    "filter report group matches parent report",
    employeeFilter.report.group_by,
    report.groupBy,
  );
  TestValidator.equals(
    "filter report billable flag matches parent report",
    employeeFilter.report.billable_only,
    report.billableOnly,
  );
  TestValidator.equals(
    "filter report include non billable flag matches parent report",
    employeeFilter.report.include_non_billable,
    report.includeNonBillable,
  );
  TestValidator.equals(
    "created report organization remains stable before delete attempt",
    report.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "created report organization name remains stable before delete attempt",
    report.organization.name,
    organizationName,
  );
  TestValidator.equals(
    "employee filter identity remains stable before delete attempt",
    employeeFilter.id,
    employeeFilterId,
  );
  TestValidator.equals(
    "employee summary identity remains stable before delete attempt",
    employeeFilter.employee.id,
    filterEmployeeId,
  );
  TestValidator.equals(
    "employee summary email remains stable before delete attempt",
    employeeFilter.employee.email,
    filterEmployeeEmail,
  );
  await TestValidator.httpError(
    "unauthorized or inaccessible delete attempt is rejected",
    [401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.reports.employeeFilters.erase(
        attackerConnection,
        {
          reportId,
          employeeFilterId,
        },
      );
    },
  );
  TestValidator.equals(
    "local report id snapshot remains unchanged after rejected delete attempt",
    report.id,
    reportId,
  );
  TestValidator.equals(
    "local report name snapshot remains unchanged after rejected delete attempt",
    report.name,
    reportName,
  );
  TestValidator.equals(
    "local report organization snapshot remains unchanged after rejected delete attempt",
    report.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "local employee filter id snapshot remains unchanged after rejected delete attempt",
    employeeFilter.id,
    employeeFilterId,
  );
  TestValidator.equals(
    "local employee filter report binding remains unchanged after rejected delete attempt",
    employeeFilter.report.id,
    reportId,
  );
  TestValidator.equals(
    "local employee identity snapshot remains unchanged after rejected delete attempt",
    employeeFilter.employee.id,
    filterEmployeeId,
  );
  TestValidator.equals(
    "local employee email snapshot remains unchanged after rejected delete attempt",
    employeeFilter.employee.email,
    filterEmployeeEmail,
  );
}
