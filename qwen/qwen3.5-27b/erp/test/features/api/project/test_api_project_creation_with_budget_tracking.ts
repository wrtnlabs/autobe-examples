import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test project creation with optional budget hours for effort estimation and tracking.
 *
 * This test validates:
 * 1. Member authentication flow with unique credentials
 * 2. Project creation with all required fields
 * 3. Optional budget_hours field for effort estimation
 * 4. Response validation including budget tracking capability
 */
export async function test_api_project_creation_with_budget_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create project WITH budget_hours for effort tracking
  const projectWithBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          status: "active",
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
          >(),
        },
      },
    );
  typia.assert(projectWithBudget);
  // 3. Create project WITHOUT budget_hours (null)
  const projectWithoutBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          status: "active",
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          budget_hours: null,
        },
      },
    );
  typia.assert(projectWithoutBudget);
  // 4. Verify both projects have unique IDs
  TestValidator.notEquals(
    "projects have different IDs",
    projectWithBudget.id,
    projectWithoutBudget.id,
  );
  // 5. Verify budget_hours field is correctly stored
  TestValidator.predicate(
    "project with budget has positive budget_hours",
    projectWithBudget.budget_hours !== null &&
      projectWithBudget.budget_hours > 0,
  );
  TestValidator.equals(
    "project without budget has null budget_hours",
    projectWithoutBudget.budget_hours,
    null,
  );
}
