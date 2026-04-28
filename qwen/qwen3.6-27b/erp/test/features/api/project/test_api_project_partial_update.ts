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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Tests partial update of project attributes including name, description, color_code, and budget.
 *
 * Authenticates as member, creates an initial project, then updates the project modifying
 * the name, description, color_code (hex format), and budget (estimated hours).
 *
 * Verifies the response returns the fully updated IHrmPlatformProject record reflecting
 * all modified fields and that the status remains 'Active' (default).
 *
 * Validates that partial updates work correctly where only provided fields are changed
 * and omitted fields retain their previous values. This tests the primary success path
 * for project attribute modification within an organization.
 */
export async function test_api_project_partial_update(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com/ref",
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create an initial project
  const initialProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(initialProject);
  // 3. Prepare update data
  const updateName: string = RandomGenerator.paragraph({ sentences: 2 });
  const updateDescription: string | null = RandomGenerator.content({
    paragraphs: 1,
  });
  const updateColorCode: string = "#AABBCC";
  const updateBudget: number | null = typia.random<
    number & tags.Type<"uint32">
  >() satisfies number | null;
  // 4. Update project
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: initialProject.id,
      body: {
        name: updateName,
        description: updateDescription,
        color_code: updateColorCode,
        budget: updateBudget,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject);
  // 5. Validate
  TestValidator.equals("ID matches", updatedProject.id, initialProject.id);
  TestValidator.equals("Name matches", updatedProject.name, updateName);
  TestValidator.equals(
    "Description matches",
    updatedProject.description,
    updateDescription,
  );
  TestValidator.equals(
    "Color code matches",
    updatedProject.color_code,
    updateColorCode,
  );
  TestValidator.equals("Budget matches", updatedProject.budget, updateBudget);
  TestValidator.equals("Status is Active", updatedProject.status, "Active");
}
