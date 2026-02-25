import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
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
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test that an administrator cannot ban themselves.
 *
 * Validates the BAN_SELF_PROHIBITED error condition where an administrator
 * attempts to ban their own account. This tests the business rule that
 * prevents self-banning at the API level.
 *
 * Steps:
 * 1. Create and authenticate a user account
 * 2. Attempt to ban themselves using their own authentication token
 * 3. Verify the API returns HTTP 400 error
 */
export async function test_api_ban_self_prohibited(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Step 2 & 3: Attempt to ban themselves and verify error
  await TestValidator.httpError(
    "administrator cannot ban themselves",
    400,
    async () => {
      await api.functional.discussionBoard.bans.create(userConnection, {
        body: {
          userId: user.id,
          reason:
            "Attempting to ban myself for testing the self-ban prohibition rule",
        } satisfies IDiscussionBoardBan.ICreate,
      });
    },
  );
}
