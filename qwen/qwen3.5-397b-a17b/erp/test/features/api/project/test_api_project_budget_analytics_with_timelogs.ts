import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_project_budget_analytics_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
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
  // 3. Create employee record for the member (required for timelog creation)
  // The prepare function will generate a valid role_id
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create project with budget_hours set to 100 hours
  const budgetHours = 100;
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        budget_hours: budgetHours,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Create multiple timelogs for the project with varying durations
  // Total duration: 30 + 45 + 25 = 100 minutes = 1.666... hours
  const timelogDurations = [30, 45, 25]; // in minutes
  const timelogs: IHrmPlatformTimelog[] = [];
  for (const duration of timelogDurations) {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: new Date().toISOString(),
          duration_minutes: duration,
          billable: true,
        },
      },
    );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // Calculate expected actual hours from timelogs
  const totalMinutes = timelogDurations.reduce(
    (sum, duration) => sum + duration,
    0,
  );
  const expectedActualHours = totalMinutes / 60;
  // 6. Call budget analytics endpoint
  const analytics =
    await api.functional.hrmPlatform.member.projects.analytics.budget(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(analytics);
  // 7. Validate response
  TestValidator.equals("projectId matches", analytics.projectId, project.id);
  TestValidator.equals(
    "budgetHours matches project definition",
    analytics.budgetHours,
    budgetHours,
  );
  TestValidator.equals(
    "actualHours equals sum of timelog durations",
    analytics.actualHours,
    expectedActualHours,
  );
  // Validate consumption percentage calculation: (actualHours / budgetHours) * 100
  const expectedConsumptionPercentage =
    (expectedActualHours / budgetHours) * 100;
  TestValidator.equals(
    "consumptionPercentage correctly calculated",
    analytics.consumptionPercentage,
    expectedConsumptionPercentage,
  );
  // Validate remaining hours calculation: budgetHours - actualHours
  const expectedRemainingHours = budgetHours - expectedActualHours;
  TestValidator.equals(
    "remainingHours correctly calculated",
    analytics.remainingHours,
    expectedRemainingHours,
  );
  // 8. Test edge case: Create additional timelogs to exceed budget
  // Add 6000 more minutes (100 hours) to exceed the 100 hour budget
  const overtimeTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: new Date().toISOString(),
          duration_minutes: 6000,
          billable: true,
        },
      },
    );
  typia.assert(overtimeTimelog);
  // Recalculate expected values with overtime
  const newTotalMinutes = totalMinutes + 6000;
  const newActualHours = newTotalMinutes / 60;
  const newConsumptionPercentage = (newActualHours / budgetHours) * 100;
  const newRemainingHours = budgetHours - newActualHours;
  // Call budget analytics again
  const overtimeAnalytics =
    await api.functional.hrmPlatform.member.projects.analytics.budget(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(overtimeAnalytics);
  // Validate overtime scenario
  TestValidator.equals(
    "actualHours with overtime",
    overtimeAnalytics.actualHours,
    newActualHours,
  );
  TestValidator.predicate(
    "consumptionPercentage exceeds 100%",
    overtimeAnalytics.consumptionPercentage !== null &&
      overtimeAnalytics.consumptionPercentage > 100,
  );
  TestValidator.equals(
    "consumptionPercentage with overtime",
    overtimeAnalytics.consumptionPercentage,
    newConsumptionPercentage,
  );
  TestValidator.predicate(
    "remainingHours is negative when over budget",
    overtimeAnalytics.remainingHours !== null &&
      overtimeAnalytics.remainingHours < 0,
  );
  TestValidator.equals(
    "remainingHours with overtime",
    overtimeAnalytics.remainingHours,
    newRemainingHours,
  );
}
