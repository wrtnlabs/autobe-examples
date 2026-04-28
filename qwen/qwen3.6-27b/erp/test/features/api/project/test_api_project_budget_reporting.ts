import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBudgetUtilization } from "@ORGANIZATION/PROJECT-api/lib/structures/IBudgetUtilization";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
 * Test project budget utilization reporting with accurate calculations.
 *
 * Validates that the budget utilization report correctly computes actual hours and percentage consumed based on all non-deleted timelog entries associated with a project. The actual hours are calculated by summing duration_minutes from all timelogs and dividing by 60, while the percentage consumed represents the ratio of actual hours against the project's configured budget hours multiplied by 100.
 *
 * 1. Authenticate a new member and establish an employee record for time tracking.
 * 2. Create a project with a configured 10-hour budget to enable utilization calculations.
 * 3. Assign the member as project lead to enable timelog creation.
 * 4. Generate multiple timelogs with known durations (240 + 540 + 660 = 1440 min = 24 hours).
 * 5. Retrieve the utilization report and verify:
 *    5.1. actual hours equals 24 (sum of durations divided by 60)
 *    5.2. percentage consumed equals 240 (24 divided by 10 multiplied by 100)
 *    5.3. project identifier and name match the created project
 */
export async function test_api_project_budget_reporting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create employee for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: authorizedMember.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 3. Create a project with a specific budget (10 hours)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        budget: 10,
      },
    },
  );
  typia.assert(project);
  TestValidator.predicate("project has budget hours", project.budget !== null);
  const budgetHours: number = project.budget!;
  // 4. Assign member as project lead
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee.id,
          capacityRole: "project-lead",
        },
      },
    );
  typia.assert(membership);
  // 5. Create timelogs with known durations (240 + 540 + 660 = 1440 min = 24 hours)
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 240,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 540,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 660,
      },
    },
  );
  typia.assert(timelog3);
  // 6. Retrieve budget utilization report
  const utilization =
    await api.functional.hrmPlatform.member.projects.reports.utilization(
      memberConnection,
      { projectId: project.id },
    );
  typia.assert(utilization);
  // 7. Validate report calculations
  const expectedDuration = (240 + 540 + 660) / 60;
  TestValidator.equals(
    "actual hours",
    utilization.actualHours,
    expectedDuration,
  );
  TestValidator.equals(
    "percentage consumed",
    utilization.percentageConsumed,
    (expectedDuration / budgetHours) * 100,
  );
  TestValidator.equals("project id", utilization.projectId, project.id);
  TestValidator.equals("project name", utilization.projectName, project.name);
}
