import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_administrators_promote } from "../../../generate/generate_random_discussion_board_user_administrators_promote";
import { prepare_random_discussion_board_admin_hierarchy_action } from "../../../prepare/prepare_random_discussion_board_admin_hierarchy_action";

/**
 * Test that a super administrator cannot promote a regular member directly.
 *
 * Business Rule: Promotion requires the target to be a regular ADMINISTRATOR,
 * not a MEMBER. This enforces proper hierarchy progression.
 *
 * Hierarchy: MEMBER → ADMINISTRATOR → SUPER_ADMINISTRATOR
 *
 * Note: This test assumes the test environment provides a way to authenticate
 * as a SUPER_ADMINISTRATOR. The authorize_user_join utility creates MEMBER-level
 * accounts, so test infrastructure must handle super admin creation.
 */
export async function test_api_administrator_promotion_member_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator account
  // Note: Test environment should have a mechanism to create super admins
  // For E2E testing purposes, we create a connection that will be used by super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_user_join(superAdminConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create a regular member account (MEMBER permission_level)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_user_join(memberConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // Verify member is at MEMBER level (default from join)
  TestValidator.equals(
    "member permission level",
    member.permission_level,
    "MEMBER",
  );
  // 3. Attempt to promote the regular member
  // This should fail because the target is a MEMBER, not an ADMINISTRATOR
  // The API validates: target's permission_level must be 'ADMINISTRATOR'
  await TestValidator.httpError(
    "cannot promote MEMBER to SUPER_ADMINISTRATOR",
    400,
    async () => {
      await api.functional.discussionBoard.user.administrators.promote(
        superAdminConnection,
        {
          administratorId: member.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardAdminHierarchyAction.ICreate,
        },
      );
    },
  );
}
