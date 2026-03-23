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
 * Test the primary success path for updating an existing project.
 * Verifies that a member with project management permission can successfully
 * update project details including name, description, color code, status, and budget hours.
 */
export async function test_api_project_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project management permission
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
  // 2. Create an initial project with valid data
  const initialProject: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          status: "active",
          color_code: "#FF5733",
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(initialProject);
  // Store initial timestamp for comparison
  const initialUpdatedAt: string = initialProject.updated_at;
  // 3. Prepare update values
  const newName: string = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription: string = RandomGenerator.paragraph({ sentences: 8 });
  const newColorCode: string = "#33FF57";
  const newBudgetHours: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<20>
  >();
  // 4. Update the project with modified values
  const updatedProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: initialProject.id,
      body: {
        name: newName,
        description: newDescription,
        status: "active",
        color_code: newColorCode,
        budget_hours: newBudgetHours,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject);
  // 5. Verify the response contains updated values
  TestValidator.equals(
    "project ID preserved",
    updatedProject.id,
    initialProject.id,
  );
  TestValidator.equals(
    "project name matches update",
    updatedProject.name,
    newName,
  );
  TestValidator.equals(
    "project description matches update",
    updatedProject.description,
    newDescription,
  );
  TestValidator.equals(
    "project status is active",
    updatedProject.status,
    "active",
  );
  TestValidator.equals(
    "project color code matches update",
    updatedProject.color_code,
    newColorCode,
  );
  TestValidator.equals(
    "budget hours matches update",
    updatedProject.budget_hours,
    newBudgetHours,
  );
  // 6. Verify updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedProject.updated_at,
    initialUpdatedAt,
  );
  // 7. Confirm organization reference is preserved
  TestValidator.equals(
    "organization ID preserved",
    updatedProject.organization.id,
    initialProject.organization.id,
  );
  TestValidator.equals(
    "organization name preserved",
    updatedProject.organization.name,
    initialProject.organization.name,
  );
}
