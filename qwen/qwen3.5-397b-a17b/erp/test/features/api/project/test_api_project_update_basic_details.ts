import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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

/**
 * Test the primary success path for updating project details.
 * 1. Member joins/authenticates
 * 2. Create organization workspace
 * 3. Create initial project
 * 4. Update project's name, description, color code, and budget hours
 * 5. Validate all updated fields are reflected in response
 * 6. Verify updated_at timestamp changes
 * 7. Test updating individual fields and multiple fields simultaneously
 * 8. Verify organization context is maintained
 */
export async function test_api_project_update_basic_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create initial project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#FF5733",
        description: RandomGenerator.content({ paragraphs: 1 }),
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 4. Update project with multiple fields
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    color_code: "#33FF57",
    budget_hours: 200,
  } satisfies IHrmPlatformProject.IUpdate;
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: updateBody,
    });
  typia.assert(updatedProject);
  // 5. Validate updated fields
  TestValidator.equals("name updated", updatedProject.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updatedProject.description,
    updateBody.description,
  );
  TestValidator.equals(
    "color_code updated",
    updatedProject.color_code,
    updateBody.color_code,
  );
  TestValidator.equals(
    "budget_hours updated",
    updatedProject.budget_hours,
    updateBody.budget_hours,
  );
  // 6. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    project.updated_at,
    updatedProject.updated_at,
  );
  // 7. Verify organization context maintained
  TestValidator.equals(
    "organization_id maintained",
    updatedProject.organization.id,
    organization.id,
  );
  // 8. Test updating individual field (name only)
  const newName = RandomGenerator.paragraph({ sentences: 1 });
  const singleFieldUpdate =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: updatedProject.id,
      body: { name: newName },
    });
  typia.assert(singleFieldUpdate);
  TestValidator.equals(
    "single field name updated",
    singleFieldUpdate.name,
    newName,
  );
  TestValidator.equals(
    "description preserved",
    singleFieldUpdate.description,
    updateBody.description,
  );
}
