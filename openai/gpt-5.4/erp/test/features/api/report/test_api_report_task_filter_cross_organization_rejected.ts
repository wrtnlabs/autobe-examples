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
import { generate_random_hrm_time_tracking_reports_task_filters_create } from "../../../generate/generate_random_hrm_time_tracking_reports_task_filters_create";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_task_filter_cross_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const report = await generate_random_hrm_time_tracking_reports_create(
    employeeConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
        rangeStartDate: null,
        rangeEndDate: null,
        groupBy: null,
        billableOnly: null,
        includeNonBillable: null,
        employeeFilters: [],
        projectFilters: [],
        taskFilters: [],
      },
    },
  );
  typia.assert(report);
  const invalidTaskId = typia.random<string & tags.Format<"uuid">>();
  const reportId = report.id;
  const reportOrganizationId = report.organization.id;
  const initialTaskFilterCount = report.taskFilters.length;
  await TestValidator.error(
    "reject task filter creation for inaccessible or missing task",
    async () => {
      await generate_random_hrm_time_tracking_reports_task_filters_create(
        employeeConnection,
        {
          params: {
            reportId,
          },
          body: {
            task_id: invalidTaskId,
          },
        },
      );
    },
  );
  TestValidator.equals(
    "report task filters remain unchanged locally",
    report.taskFilters.length,
    initialTaskFilterCount,
  );
  TestValidator.equals(
    "report still belongs to same organization locally",
    report.organization.id,
    reportOrganizationId,
  );
  TestValidator.equals(
    "report identity unchanged locally",
    report.id,
    reportId,
  );
}
