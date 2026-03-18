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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_project_budget_analytics_no_budget_constraint(
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
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create member-specific connection with auth token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
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
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create project WITHOUT budget_hours (test null budget constraint)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        budget_hours: null, // Explicitly null to test null handling
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Create multiple timelogs for the project to verify actualHours calculation
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration_minutes: 120, // 2 hours
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration_minutes: 180, // 3 hours
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration_minutes: 60, // 1 hour
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: false,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  // Expected total: 120 + 180 + 60 = 360 minutes = 6 hours
  const expectedActualHours = 6;
  // 5. Call budget analytics endpoint
  const analytics =
    await api.functional.hrmPlatform.member.projects.analytics.budget(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(analytics);
  // 6. Validate response for null budget constraint handling
  TestValidator.equals("projectId matches", analytics.projectId, project.id);
  TestValidator.equals(
    "budgetHours is null (no constraint)",
    analytics.budgetHours,
    null,
  );
  TestValidator.equals(
    "actualHours aggregates timelogs",
    analytics.actualHours,
    expectedActualHours,
  );
  TestValidator.equals(
    "consumptionPercentage is null (no budget)",
    analytics.consumptionPercentage,
    null,
  );
  TestValidator.equals(
    "remainingHours is null (no budget)",
    analytics.remainingHours,
    null,
  );
}
