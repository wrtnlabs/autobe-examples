import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
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
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_project_budget_analytics_zero_actual_hours(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create organization for project context
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
  // 3. Create project with budget_hours set to 50 hours (no timelogs will be created)
  const budgetHours = 50;
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        budget_hours: budgetHours,
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Call budget analytics endpoint (no timelogs created for this project)
  const analytics =
    await api.functional.hrmPlatform.member.projects.analytics.budget(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(analytics);
  // 5. Validate budget analytics response
  TestValidator.equals("projectId matches", analytics.projectId, project.id);
  TestValidator.equals(
    "budgetHours matches project definition",
    analytics.budgetHours,
    budgetHours,
  );
  TestValidator.equals("actualHours is zero", analytics.actualHours, 0);
  TestValidator.equals(
    "consumptionPercentage is zero",
    analytics.consumptionPercentage,
    0,
  );
  TestValidator.equals(
    "remainingHours equals budgetHours",
    analytics.remainingHours,
    budgetHours,
  );
}
