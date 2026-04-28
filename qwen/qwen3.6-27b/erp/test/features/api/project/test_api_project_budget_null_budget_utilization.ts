import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test project budget report with null budget handling.
 *
 * Validates that the budget report endpoint gracefully handles projects without a defined budget. When budget is null, the utilization percentage should also be null since division by null is not possible. However, actual hours, employee breakdowns, and billable breakdowns should still be calculated correctly from existing timelogs.
 *
 * This test covers the edge case where projects are tracked for time without a formal budget allocation, ensuring the system remains functional for timelogging and reporting even when budget constraints are not defined.
 *
 * 1. Authenticate as a new member and create employee record.
 * 2. Create a project with budget explicitly set to null.
 * 3. Assign the employee to the project as a member.
 * 4. Create two timelogs: one billable and one non-billable.
 * 5. Retrieve the budget report and validate null budget handling.
 * 6. Verify actual hours equal the sum of both timelogs.
 * 7. Confirm utilization_percent is null and breakdowns are populated.
 */
export async function test_api_project_budget_null_budget_utilization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    { body: { memberId: member.id } },
  );
  typia.assert(employee);
  // 3. Create a project with budget explicitly set to null
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: { name: "Unbudgeted Project", color_code: "#FF5733", budget: null },
    },
  );
  typia.assert(project);
  // 4. Assign employee to project
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { employeeId: employee.id, capacityRole: "member" },
      },
    );
  typia.assert(membership);
  // 5. Create billable timelog (120 minutes = 2 hours)
  const billableTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: project.id,
          date: new Date().toISOString(),
          durationMinutes: 120,
          workDescription: "Billable work",
          billable: true,
        },
      },
    );
  typia.assert(billableTimelog);
  // 6. Create non-billable timelog (60 minutes = 1 hour)
  const nonBillableTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: project.id,
          date: new Date().toISOString(),
          durationMinutes: 60,
          workDescription: "Non-billable work",
          billable: false,
        },
      },
    );
  typia.assert(nonBillableTimelog);
  // 7. Retrieve budget report
  const report =
    await api.functional.hrmPlatform.member.projects.reports.budget(
      memberConnection,
      { projectId: project.id },
    );
  typia.assert(report);
  // 8. Validate budget and utilization are null
  TestValidator.equals("budget is null when not defined", report.budget, null);
  TestValidator.equals(
    "utilization_percent is null when budget is null",
    report.utilization_percent,
    null,
  );
  // 9. Validate actual hours are calculated correctly (120 + 60 = 180 minutes = 3 hours)
  TestValidator.equals(
    "actual_hours equals sum of all timelogs in hours",
    report.actual_hours,
    3,
  );
  // 10. Validate employee breakdown exists with correct hours
  TestValidator.predicate(
    "employee_breakdowns contains one entry",
    report.employee_breakdowns.length === 1,
  );
  TestValidator.equals(
    "employee breakdown hours match total actual hours",
    report.employee_breakdowns[0].hours,
    3,
  );
  // 11. Validate billable breakdowns
  TestValidator.predicate(
    "billable_breakdowns contains two entries",
    report.billable_breakdowns.length === 2,
  );
  const billableBreakdown = report.billable_breakdowns.find(
    (b) => b.billable === true,
  );
  const nonBillableBreakdown = report.billable_breakdowns.find(
    (b) => b.billable === false,
  );
  TestValidator.predicate(
    "billable breakdown exists",
    billableBreakdown !== undefined,
  );
  TestValidator.predicate(
    "non-billable breakdown exists",
    nonBillableBreakdown !== undefined,
  );
  TestValidator.equals(
    "billable hours correct",
    billableBreakdown!.total_hours,
    2,
  );
  TestValidator.equals(
    "non-billable hours correct",
    nonBillableBreakdown!.total_hours,
    1,
  );
  TestValidator.equals(
    "billable timelog count is 1",
    billableBreakdown!.timelog_count,
    1,
  );
  TestValidator.equals(
    "non-billable timelog count is 1",
    nonBillableBreakdown!.timelog_count,
    1,
  );
}
