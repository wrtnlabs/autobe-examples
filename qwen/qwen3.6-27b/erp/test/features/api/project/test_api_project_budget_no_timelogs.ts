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
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

/**
 * Test project budget report for a project with defined budget but no timelogs.
 *
 * Validates that the budget report correctly handles projects where a budget has been defined but no time has been logged yet. The report should show zero actual hours, zero percent utilization, empty employee breakdowns, and billable breakdowns with zero values for both billable categories.
 *
 * Special attention is given to verifying that the budget report gracefully handles the edge case of no timelog entries while still returning all expected breakdown structures with appropriate zero values.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Employee record is created within the member's organization.
 * 3. Project is created with a defined budget of 100 hours.
 * 4. Employee is assigned as a project member.
 * 5. Budget report is retrieved for the project.
 * 6. Validates budget shows 100 hours, actual hours is 0, utilization is 0, employee breakdowns is empty, and billable breakdowns have two zero-value entries.
 */
export async function test_api_project_budget_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create employee record
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create project with defined budget
  const BUDGET_HOURS = 100;
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        budget: BUDGET_HOURS,
      },
    },
  );
  typia.assert(project);
  // 4. Assign employee to project
  await generate_random_hrm_platform_member_projects_memberships_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        employeeId: employee.id,
        capacityRole: "member",
      },
    },
  );
  // 5. Retrieve budget report (no utility function available)
  const report =
    await api.functional.hrmPlatform.member.projects.reports.budget(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(report);
  // 6. Validate report data for project with no timelogs
  TestValidator.equals(
    "budget shows defined value",
    report.budget,
    BUDGET_HOURS,
  );
  TestValidator.equals("actual hours is zero", report.actual_hours, 0);
  TestValidator.equals(
    "utilization percent is zero",
    report.utilization_percent,
    0,
  );
  TestValidator.equals(
    "employee breakdowns is empty array",
    report.employee_breakdowns.length,
    0,
  );
  TestValidator.equals(
    "billable breakdowns has two entries",
    report.billable_breakdowns.length,
    2,
  );
  TestValidator.predicate(
    "billable breakdowns contain both billable and non-billable entries",
    () => {
      const hasBillable = report.billable_breakdowns.some(
        (b) => b.billable === true,
      );
      const hasNonBillable = report.billable_breakdowns.some(
        (b) => b.billable === false,
      );
      return hasBillable && hasNonBillable;
    },
  );
  TestValidator.predicate(
    "both billable breakdowns have zero hours",
    () =>
      report.billable_breakdowns.every((b) => b.total_hours === 0) &&
      report.billable_breakdowns.every((b) => b.timelog_count === 0),
  );
}
