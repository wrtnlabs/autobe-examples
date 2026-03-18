import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
import type { IHrmPlatformProjectDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectDashboard";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test project dashboard budget utilization alerts when projects exceed 80% threshold.
 *
 * This test validates the budget utilization tracking feature of the project dashboard:
 * 1. Creates a member account with report:view permission
 * 2. Creates multiple projects with different budget_hours values
 * 3. Creates timelogs within the current week to generate actual hours
 * 4. Ensures some projects exceed 80% budget utilization while others stay below
 * 5. Retrieves the dashboard and validates budgetUtilization alerts
 * 6. Verifies that only projects > 80% appear in the alert array
 * 7. Validates consumptionPercentage calculation accuracy
 */
export async function test_api_project_dashboard_budget_utilization_alerts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (automatically gets report:view permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create projects with budget_hours - some will exceed 80%, others won't
  // Project 1: Budget 10 hours, will log 9 hours (90% utilization - should trigger alert)
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Budget Test Project 1 - ${RandomGenerator.name()}`,
        color_code: "#FF5733",
        budget_hours: 10,
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project1);
  // Project 2: Budget 8 hours, will log 7.5 hours (93.75% utilization - should trigger alert)
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Budget Test Project 2 - ${RandomGenerator.name()}`,
        color_code: "#33FF57",
        budget_hours: 8,
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project2);
  // Project 3: Budget 20 hours, will log 8 hours (40% utilization - should NOT trigger alert)
  const project3 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Budget Test Project 3 - ${RandomGenerator.name()}`,
        color_code: "#3357FF",
        budget_hours: 20,
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project3);
  // Project 4: Budget 12 hours, will log 10.5 hours (87.5% utilization - should trigger alert)
  const project4 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Budget Test Project 4 - ${RandomGenerator.name()}`,
        color_code: "#FF33F5",
        budget_hours: 12,
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project4);
  // 3. Calculate current week's Monday date in ISO format
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(12, 0, 0, 0);
  const currentWeekDate = monday.toISOString();
  // 4. Create timelogs for current week
  // Project 1: 9 hours = 540 minutes total (spread across 3 timelogs of 180 min each)
  await ArrayUtil.asyncRepeat(3, async () => {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project1.id,
          date: currentWeekDate,
          duration_minutes: 180,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
    typia.assert(timelog);
  });
  // Project 2: 7.5 hours = 450 minutes total (3 timelogs of 150 min each)
  await ArrayUtil.asyncRepeat(3, async () => {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project2.id,
          date: currentWeekDate,
          duration_minutes: 150,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
    typia.assert(timelog);
  });
  // Project 3: 8 hours = 480 minutes total (3 timelogs of 160 min each) - 40% of 20 hours
  await ArrayUtil.asyncRepeat(3, async () => {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project3.id,
          date: currentWeekDate,
          duration_minutes: 160,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
    typia.assert(timelog);
  });
  // Project 4: 10.5 hours = 630 minutes total (3 timelogs of 210 min each)
  await ArrayUtil.asyncRepeat(3, async () => {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project4.id,
          date: currentWeekDate,
          duration_minutes: 210,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
    typia.assert(timelog);
  });
  // 5. Retrieve project dashboard
  const dashboard: IHrmPlatformProjectDashboard =
    await api.functional.hrmPlatform.member.dashboard.projects.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 6. Validate dashboard structure
  TestValidator.predicate(
    "total projects exists",
    dashboard.totalProjects >= 4,
  );
  TestValidator.predicate(
    "status breakdown active exists",
    dashboard.statusBreakdown.active >= 0,
  );
  TestValidator.predicate(
    "status breakdown archived exists",
    dashboard.statusBreakdown.archived >= 0,
  );
  TestValidator.predicate(
    "status breakdown completed exists",
    dashboard.statusBreakdown.completed >= 0,
  );
  // 7. Validate budget utilization alerts
  TestValidator.predicate(
    "budgetUtilization is array",
    Array.isArray(dashboard.budgetUtilization),
  );
  // Projects 1, 2, and 4 should be in budgetUtilization (> 80%)
  // Project 3 should NOT be in budgetUtilization (40%)
  const alertedProjectIds = dashboard.budgetUtilization.map(
    (analytic) => analytic.projectId,
  );
  TestValidator.predicate(
    "project 1 (90%) should be in alerts",
    alertedProjectIds.includes(project1.id),
  );
  TestValidator.predicate(
    "project 2 (93.75%) should be in alerts",
    alertedProjectIds.includes(project2.id),
  );
  TestValidator.predicate(
    "project 3 (40%) should NOT be in alerts",
    !alertedProjectIds.includes(project3.id),
  );
  TestValidator.predicate(
    "project 4 (87.5%) should be in alerts",
    alertedProjectIds.includes(project4.id),
  );
  // 8. Validate each budget analytic entry
  for (const analytic of dashboard.budgetUtilization) {
    // Validate budgetHours is not null (only projects with budget appear)
    TestValidator.predicate(
      "budgetHours must be defined",
      analytic.budgetHours !== null,
    );
    // Validate actualHours is non-negative
    TestValidator.predicate(
      "actualHours is non-negative",
      analytic.actualHours >= 0,
    );
    // Validate consumptionPercentage is > 80 (threshold requirement)
    TestValidator.predicate(
      "consumptionPercentage exceeds 80% threshold",
      analytic.consumptionPercentage !== null &&
        analytic.consumptionPercentage > 80,
    );
    // Validate remainingHours calculation
    if (analytic.budgetHours !== null) {
      const expectedRemaining = analytic.budgetHours - analytic.actualHours;
      TestValidator.equals(
        "remainingHours calculation",
        analytic.remainingHours,
        expectedRemaining,
      );
      // Validate consumptionPercentage calculation accuracy
      const expectedPercentage =
        (analytic.actualHours / analytic.budgetHours) * 100;
      TestValidator.predicate(
        "consumptionPercentage calculation accuracy",
        Math.abs(analytic.consumptionPercentage! - expectedPercentage) < 0.01,
      );
    }
  }
  // 9. Validate top projects by hours
  TestValidator.predicate(
    "topProjectsByHours is array",
    Array.isArray(dashboard.topProjectsByHours),
  );
  TestValidator.predicate(
    "topProjectsByHours max 5 items",
    dashboard.topProjectsByHours.length <= 5,
  );
  for (const topProject of dashboard.topProjectsByHours) {
    TestValidator.predicate(
      "top project has hours logged",
      topProject.totalHoursLogged >= 0,
    );
  }
}
