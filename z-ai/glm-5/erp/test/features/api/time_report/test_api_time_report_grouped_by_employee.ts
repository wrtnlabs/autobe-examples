import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeReport";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_time_report_grouped_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (becomes organization owner with full permissions including report:view)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // 2. Create a project for time tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(project);
  // 3. Create multiple timelogs with varying billable status across different dates
  // The API infers employee from the authenticated session, so we don't need explicit employee assignment
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Create billable timelogs
  const billableDurations: number[] = [120, 180, 90]; // 2h, 3h, 1.5h in minutes
  const billableTimelogs: IErpHrmTimelog[] = [];
  for (let i = 0; i < billableDurations.length; i++) {
    const date = new Date(now.getTime() - i * oneDayMs);
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: date.toISOString(),
          duration: billableDurations[i],
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        },
      },
    );
    typia.assert(timelog);
    billableTimelogs.push(timelog);
  }
  // Create non-billable timelogs
  const nonBillableDurations: number[] = [60, 150]; // 1h, 2.5h in minutes
  const nonBillableTimelogs: IErpHrmTimelog[] = [];
  for (let i = 0; i < nonBillableDurations.length; i++) {
    const date = new Date(
      now.getTime() - (i + billableDurations.length) * oneDayMs,
    );
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: date.toISOString(),
          duration: nonBillableDurations[i],
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: false,
        },
      },
    );
    typia.assert(timelog);
    nonBillableTimelogs.push(timelog);
  }
  // 4. Generate time report grouped by employee with date range covering all timelogs
  const allTimelogs = [...billableTimelogs, ...nonBillableTimelogs];
  const dates = allTimelogs.map((t) => new Date(t.date).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  // Extend date range slightly to ensure all timelogs are included
  const fromDate = new Date(minDate.getTime() - oneDayMs);
  const toDate = new Date(maxDate.getTime() + oneDayMs);
  const reportResponse = await api.functional.erpHrm.member.reports.time.index(
    memberConnection,
    {
      body: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        groupBy: "employee",
      },
    },
  );
  typia.assert(reportResponse);
  // 5. Validate the report response
  const totalTimelogs = billableTimelogs.length + nonBillableTimelogs.length;
  const totalDurationMinutes =
    billableDurations.reduce((sum, d) => sum + d, 0) +
    nonBillableDurations.reduce((sum, d) => sum + d, 0);
  const billableDurationMinutes = billableDurations.reduce(
    (sum, d) => sum + d,
    0,
  );
  const nonBillableDurationMinutes = nonBillableDurations.reduce(
    (sum, d) => sum + d,
    0,
  );
  // Validate pagination exists
  TestValidator.predicate(
    "pagination should exist",
    reportResponse.pagination !== undefined,
  );
  // Validate there is at least one result for the employee
  TestValidator.predicate(
    "report should have results",
    reportResponse.data.length >= 1,
  );
  // Get the first report entry (should be for our employee)
  const report = reportResponse.data[0];
  // Validate employee property is populated when grouping by employee
  TestValidator.predicate(
    "employee property should be populated when groupBy='employee'",
    report.employee !== null,
  );
  // Validate project and task properties are null when grouping by employee
  TestValidator.equals(
    "project property should be null when groupBy='employee'",
    report.project,
    null,
  );
  TestValidator.equals(
    "task property should be null when groupBy='employee'",
    report.task,
    null,
  );
  // Validate groupBy is correctly set
  TestValidator.equals(
    "groupBy should be 'employee'",
    report.groupBy,
    "employee",
  );
  // Validate total hours (sum of all durations in hours)
  const expectedTotalHours = totalDurationMinutes / 60;
  TestValidator.predicate(
    "total hours should match sum of all timelog durations",
    Math.abs(report.totalHours - expectedTotalHours) < 0.01,
  );
  // Validate billable hours (sum of billable timelogs only)
  const expectedBillableHours = billableDurationMinutes / 60;
  TestValidator.predicate(
    "billable hours should match sum of billable timelogs",
    Math.abs(report.billableHours - expectedBillableHours) < 0.01,
  );
  // Validate non-billable hours (sum of non-billable timelogs only)
  const expectedNonBillableHours = nonBillableDurationMinutes / 60;
  TestValidator.predicate(
    "non-billable hours should match sum of non-billable timelogs",
    Math.abs(report.nonBillableHours - expectedNonBillableHours) < 0.01,
  );
  // Validate timelog count matches number of created entries
  TestValidator.equals(
    "timelog count should match number of created timelogs",
    report.timelogCount,
    totalTimelogs,
  );
  // Validate that total hours equals billable + non-billable hours
  TestValidator.predicate(
    "total hours should equal billable plus non-billable hours",
    Math.abs(
      report.totalHours - (report.billableHours + report.nonBillableHours),
    ) < 0.01,
  );
}
