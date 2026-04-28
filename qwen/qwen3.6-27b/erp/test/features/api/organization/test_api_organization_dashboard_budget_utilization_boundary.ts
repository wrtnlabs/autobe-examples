import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformHighUtilizationProjectSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformHighUtilizationProjectSummary";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
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
 * Test organization dashboard budget utilization boundary conditions.
 *
 * Verifies the dashboard correctly identifies projects at or above 80% budget utilization as high-utilization projects. Tests that projects with exactly 80% utilization are included, projects below 80% are excluded, and projects with no budget set are excluded from the high-utilization list.
 *
 * Special attention is given to validating the threshold boundary at exactly 80% and ensuring the utilization calculation correctly sums all non-deleted timelog duration_minutes, divides by 60, and compares against the budget hours.
 *
 * 1. Member1 joins platform and becomes organization owner via authorize_member_join.
 * 2. Member2 joins platform separately as another user with known password for later login.
 * 3. Member1 creates three projects with defined budgets: one for exactly 80% utilization test (budget 10h), one for below-threshold test (budget 10h), and one with null budget.
 * 4. Member2 is invited as employee into member1's organization using generate utility that handles role preparation.
 * 5. Employee2 is added as project-lead to all three projects.
 * 6. Member2 re-authenticates with known credentials.
 * 7. Member2 creates multiple timelogs: project1 receives 480 minutes total (8h = 80% of 10h budget), project2 receives 475 minutes total (7.92h ≈ 79% of 10h budget).
 * 8. Organization dashboard is queried and validated.
 * 9. Project1 appears in budgetHighUtilizationProjects with 80% utilization percentage.
 * 10. Project2 does not appear (below 80% threshold).
 * 11. Project3 does not appear (null budget excluded).
 */
export async function test_api_organization_dashboard_budget_utilization_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member1 (organization owner)
  // authorize_member_join sets the token in connection headers
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Joined = await authorize_member_join(member1Connection, {
    body: {},
  });
  typia.assert(member1Joined);
  // 2. Create member2 with known credentials for later login
  const member2Password = "Test1234!";
  const member2Email = `${RandomGenerator.alphabets(8)}@example.com`;
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Joined = await authorize_member_join(member2Connection, {
    body: {
      email: member2Email,
      password: member2Password,
    },
  });
  typia.assert(member2Joined);
  // 3. Create three projects with specific budgets
  // project1: budget 10 hours (600 min), target 480 min actual = exactly 80%
  const project1 = await generate_random_hrm_platform_member_projects_create(
    member1Connection,
    {
      body: { budget: 10 },
    },
  );
  typia.assert(project1);
  const budget1 = project1.budget!;
  // project2: budget 10 hours (600 min), target 475 min actual = ~79.17% < 80%
  const project2 = await generate_random_hrm_platform_member_projects_create(
    member1Connection,
    {
      body: { budget: 10 },
    },
  );
  typia.assert(project2);
  // project3: no budget set, should be excluded entirely
  const project3 = await generate_random_hrm_platform_member_projects_create(
    member1Connection,
    {
      body: { budget: null },
    },
  );
  typia.assert(project3);
  // 4. Create employee2 (member2) in member1's org
  // Pass memberId explicitly; generate utility's prepare function handles roleId
  const employee2 = await generate_random_hrm_platform_member_employees_create(
    member1Connection,
    {
      body: { memberId: member2Joined.id },
    },
  );
  typia.assert(employee2);
  // 5. Add employee2 to all three projects as project-lead
  await generate_random_hrm_platform_member_projects_memberships_create(
    member1Connection,
    {
      params: { projectId: project1.id },
      body: {
        employeeId: employee2.id,
        capacityRole: "project-lead",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_memberships_create(
    member1Connection,
    {
      params: { projectId: project2.id },
      body: {
        employeeId: employee2.id,
        capacityRole: "project-lead",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_memberships_create(
    member1Connection,
    {
      params: { projectId: project3.id },
      body: {
        employeeId: employee2.id,
        capacityRole: "project-lead",
      },
    },
  );
  // 6. Re-authenticate member2 with known credentials
  await authorize_member_login(member2Connection, {
    body: { email: member2Email, password: member2Password, href: "", referrer: "" },
  });
  // 7. Create timelogs via member2 connection for exact minute totals
  // Project1: 480 minutes total = 8 hours = 80% of 10h budget → SHARED IN high-utilization
  const tl1a = await generate_random_hrm_platform_member_timelogs_create(
    member2Connection,
    {
      body: { projectId: project1.id, durationMinutes: 240 },
    },
  );
  typia.assert(tl1a);
  const tl1b = await generate_random_hrm_platform_member_timelogs_create(
    member2Connection,
    {
      body: { projectId: project1.id, durationMinutes: 240 },
    },
  );
  typia.assert(tl1b);
  // Project2: 475 minutes total = 7.917 hours ≈ 79.17% of 10h budget → EXCLUDED
  const tl2a = await generate_random_hrm_platform_member_timelogs_create(
    member2Connection,
    {
      body: { projectId: project2.id, durationMinutes: 240 },
    },
  );
  typia.assert(tl2a);
  const tl2b = await generate_random_hrm_platform_member_timelogs_create(
    member2Connection,
    {
      body: { projectId: project2.id, durationMinutes: 235 },
    },
  );
  typia.assert(tl2b);
  // 8. Query organization dashboard via member1
  const dashboard =
    await api.functional.hrmPlatform.member.organization_dashboard.at(
      member1Connection,
    );
  typia.assert(dashboard);
  // 9. Validate high-utilization projects
  // Project1 should be present with ~80% utilization
  const highUtilProject1 = dashboard.budgetHighUtilizationProjects.find(
    (p) => p.id === project1.id,
  );
  TestValidator.predicate(
    "project at exactly 80% is in high utilization list",
    highUtilProject1 !== undefined,
  );
  if (highUtilProject1 !== undefined) {
    TestValidator.equals(
      "budget hours matches project budget",
      highUtilProject1.budgetHours,
      budget1,
    );
    TestValidator.equals(
      "actual hours is 8 (480 minutes / 60)",
      highUtilProject1.actualHours,
      8,
    );
    TestValidator.equals(
      "utilization percentage is at least 80",
      highUtilProject1.utilizationPercentage,
      80,
    );
  }
  // Project2 should NOT be present (below 80%)
  const highUtilProject2 = dashboard.budgetHighUtilizationProjects.find(
    (p) => p.id === project2.id,
  );
  TestValidator.predicate(
    "project below 80% is not in high utilization list",
    highUtilProject2 === undefined,
  );
  // Project3 should NOT be present (null budget)
  const highUtilProject3 = dashboard.budgetHighUtilizationProjects.find(
    (p) => p.id === project3.id,
  );
  TestValidator.predicate(
    "project with null budget is not in high utilization list",
    highUtilProject3 === undefined,
  );
  // 10. Validate other dashboard metrics
  TestValidator.predicate(
    "active employees count is at least 2",
    dashboard.activeEmployeesCount >= 2,
  );
  TestValidator.predicate(
    "total hours this week is at least 15 (8 + 7)",
    dashboard.totalHoursThisWeek >= 15,
  );
}