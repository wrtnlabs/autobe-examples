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
 * Test the self-promotion prevention business rule.
 *
 * A super administrator cannot promote themselves. This test verifies that
 * the API returns 400 Bad Request when a super administrator attempts
 * to promote their own account.
 */
export async function test_api_administrator_promotion_self_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create a user account (test framework should set permission_level to SUPER_ADMINISTRATOR)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_user_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // Prepare promotion request body with optional reason
  const body = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardAdminHierarchyAction.ICreate;
  // Super administrator attempts to promote themselves
  // Should return 400 Bad Request for self-promotion prevention
  await TestValidator.httpError("self-promotion prevention", 400, async () => {
    await api.functional.discussionBoard.user.administrators.promote(
      superAdminConnection,
      {
        administratorId: superAdmin.id,
        body,
      },
    );
  });
}
