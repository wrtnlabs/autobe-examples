import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_sections_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_administrators_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

/**
 * Test authorization validation for administrator assignment removal.
 * 1. Authenticate as super admin and create a section
 * 2. Assign an administrator to the section
 * 3. Attempt to remove the assignment as a regular user
 * 4. Verify unauthorized access is properly rejected
 */
export async function test_api_section_administrator_removal_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular user connection and authenticate first (for setup)
  const regularUserConnection: api.IConnection = { host: connection.host };
  const regularUser = await authorize_user_login(regularUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Step 2: Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Step 3: Create a section as super admin
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          status: "active",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Step 4: Assign an administrator to the section (assigning the super admin)
  const assignment =
    await api.functional.discussionBoard.superAdmin.sections.administrators.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          permission_level: "moderator",
          admin_id: null,
          super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(assignment);
  // Step 5: Attempt to remove the assignment as regular user (should fail)
  await TestValidator.error(
    "unauthorized assignment removal",
    async () =>
      await api.functional.discussionBoard.superAdmin.sections.administrators.erase(
        regularUserConnection,
        {
          sectionId: section.id,
          assignmentId: assignment.id,
        },
      ),
  );
  // Step 6: Verify assignment still exists by attempting removal as super admin (should succeed)
  await api.functional.discussionBoard.superAdmin.sections.administrators.erase(
    superAdminConnection,
    {
      sectionId: section.id,
      assignmentId: assignment.id,
    },
  );
}
