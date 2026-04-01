import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the dashboard endpoint for a user with report:view permission (manager or owner role).
 *
 * This test validates both personal metrics and organization-wide analytics sections:
 * 1. Register manager member account and create organization (manager becomes owner)
 * 2. Select organization context
 * 3. Create projects with budget_hours for utilization tracking
 * 4. Create timelog entries for organization-wide aggregation testing
 * 5. Create a timesheet for the current week
 * 6. Call dashboard endpoint and validate organization analytics structure
 * 7. Verify activeEmployeeCount, totalWeeklyHours, highBudgetUtilizationProjects, and topPerformers
 */
export async function test_api_dashboard_manager_organization_analytics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register manager member and create organization (becomes owner with report:view)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(managerAuth);
  // 2. Create organization for testing
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Select organization context
  await api.functional.hrmPlatform.member.organizations.select(
    managerConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Create projects with budget_hours for utilization tracking
  const projectWithHighUtilization =
    await generate_random_hrm_platform_member_projects_create(
      managerConnection,
      {
        body: {
          name: "High Utilization Project",
          color_code: "#FF0000",
          status: "active",
          budget_hours: 100, // 100 hours budget
        },
      },
    );
  typia.assert(projectWithHighUtilization);
  const projectWithLowUtilization =
    await generate_random_hrm_platform_member_projects_create(
      managerConnection,
      {
        body: {
          name: "Low Utilization Project",
          color_code: "#00FF00",
          status: "active",
          budget_hours: 100, // 100 hours budget
        },
      },
    );
  typia.assert(projectWithLowUtilization);
  // 5. Create timelog entries for organization-wide aggregation
  const currentWeekStart = new Date();
  currentWeekStart.setDate(
    currentWeekStart.getDate() - currentWeekStart.getDay() + 1,
  ); // Monday
  currentWeekStart.setHours(0, 0, 0, 0);
  // Create timelogs for high utilization project (85 hours = 5100 minutes, > 80% of 100)
  for (let i = 0; i < 85; i++) {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      managerConnection,
      {
        body: {
          date: currentWeekStart.toISOString(),
          durationMinutes: 60, // 1 hour each
          projectId: projectWithHighUtilization.id,
        },
      },
    );
    typia.assert(timelog);
  }
  // Create timelogs for low utilization project (50 hours = 3000 minutes, 50% of 100)
  for (let i = 0; i < 50; i++) {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      managerConnection,
      {
        body: {
          date: currentWeekStart.toISOString(),
          durationMinutes: 60, // 1 hour each
          projectId: projectWithLowUtilization.id,
        },
      },
    );
    typia.assert(timelog);
  }
  // 6. Create a timesheet for the current week
  const weekStartDate = currentWeekStart.toISOString().split("T")[0];
  const weekEndDate = new Date(currentWeekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6); // Sunday
  const weekEndDateStr = weekEndDate.toISOString().split("T")[0];
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    managerConnection,
    {
      body: {
        week_start_date: weekStartDate,
        week_end_date: weekEndDateStr,
      },
    },
  );
  typia.assert(timesheet);
  // 7. Call dashboard endpoint and validate organization analytics
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.at(managerConnection);
  typia.assert(dashboard);
  // Validate personal metrics exist
  TestValidator.predicate(
    "personal metrics exist",
    dashboard.personal !== undefined,
  );
  TestValidator.predicate(
    "hoursToday is non-negative",
    dashboard.personal.hoursToday >= 0,
  );
  TestValidator.predicate(
    "hoursThisWeek is non-negative",
    dashboard.personal.hoursThisWeek >= 0,
  );
  // Validate organization analytics exist (manager has report:view as owner)
  TestValidator.predicate(
    "organization analytics exist",
    dashboard.organization !== null,
  );
  if (dashboard.organization) {
    // Validate activeEmployeeCount (at least 1 - the manager/owner)
    TestValidator.predicate(
      "activeEmployeeCount is at least 1",
      dashboard.organization.activeEmployeeCount >= 1,
    );
    // Validate totalWeeklyHours (should include all timelogs created this week: 85 + 50 = 135 hours)
    const expectedTotalHours = 135;
    TestValidator.predicate(
      "totalWeeklyHours matches expected",
      dashboard.organization.totalWeeklyHours >= expectedTotalHours,
    );
    // Validate pendingTimesheetsCount is a valid number
    TestValidator.predicate(
      "pendingTimesheetsCount is non-negative",
      dashboard.organization.pendingTimesheetsCount >= 0,
    );
    // Validate highBudgetUtilizationProjects structure
    TestValidator.predicate(
      "highBudgetUtilizationProjects is array",
      Array.isArray(dashboard.organization.highBudgetUtilizationProjects),
    );
    // Find the high utilization project in the results
    const highUtilProject =
      dashboard.organization.highBudgetUtilizationProjects.find(
        (p) => p.project.id === projectWithHighUtilization.id,
      );
    TestValidator.predicate(
      "high utilization project found in dashboard",
      highUtilProject !== undefined,
    );
    if (highUtilProject) {
      TestValidator.equals(
        "high utilization project budget_hours matches",
        highUtilProject.budget_hours,
        100,
      );
      TestValidator.predicate(
        "high utilization project utilization_percentage > 80",
        highUtilProject.utilization_percentage > 80,
      );
      TestValidator.predicate(
        "high utilization project actual_hours > 80",
        highUtilProject.actual_hours > 80,
      );
    }
    // Validate low utilization project is NOT in high utilization list
    const lowUtilProject =
      dashboard.organization.highBudgetUtilizationProjects.find(
        (p) => p.project.id === projectWithLowUtilization.id,
      );
    TestValidator.predicate(
      "low utilization project not in high utilization list",
      lowUtilProject === undefined,
    );
    // Validate topPerformers structure
    TestValidator.predicate(
      "topPerformers is array",
      Array.isArray(dashboard.organization.topPerformers),
    );
    TestValidator.predicate(
      "topPerformers has at least 1 entry",
      dashboard.organization.topPerformers.length >= 1,
    );
    // Validate top performers structure and sorting (descending by totalHours)
    for (let i = 0; i < dashboard.organization.topPerformers.length; i++) {
      const performer = dashboard.organization.topPerformers[i];
      TestValidator.predicate(
        `topPerformers[${i}].employee exists`,
        performer.employee !== undefined,
      );
      TestValidator.predicate(
        `topPerformers[${i}].employee.id is valid`,
        performer.employee.id !== undefined,
      );
      TestValidator.predicate(
        `topPerformers[${i}].totalHours is non-negative`,
        performer.totalHours >= 0,
      );
    }
    // Validate top performers are sorted by totalHours descending
    for (let i = 1; i < dashboard.organization.topPerformers.length; i++) {
      TestValidator.predicate(
        `topPerformers sorted: [${i - 1}].totalHours >= [${i}].totalHours`,
        dashboard.organization.topPerformers[i - 1].totalHours >=
          dashboard.organization.topPerformers[i].totalHours,
      );
    }
  }
}
