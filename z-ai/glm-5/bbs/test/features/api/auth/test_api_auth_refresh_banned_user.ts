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

export async function test_api_auth_refresh_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a regular user and obtain tokens
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  // Store the refresh token for later use
  const refreshToken = userAuth.token.refresh;
  // Step 2: Verify initial refresh works (user not banned yet)
  const initialRefreshConnection: api.IConnection = { host: connection.host };
  const initialRefresh = await api.functional.discussionBoard.auth.user.refresh(
    initialRefreshConnection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardUser.IRefresh,
    },
  );
  typia.assert(initialRefresh);
  // Step 3: Create an administrator user for banning operation
  // Note: In production, admin accounts are created through a separate provisioning process
  // This test assumes the test environment has admin creation capability or pre-seeded admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_user_join(adminConnection, {
    body: {
      displayName: "Admin " + RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // Step 4: Attempt to ban the regular user
  // Note: This operation requires ADMINISTRATOR permission level
  // The test validates that if a ban succeeds, refresh should fail
  const banResult = await api.functional.discussionBoard.bans.create(
    adminConnection,
    {
      body: {
        userId: userAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  // If ban succeeds, validate the banned user cannot refresh
  if (banResult) {
    typia.assert(banResult);
    // Step 5: Attempt to refresh token with banned user's refresh token
    // This should fail with AUTH_USER_BANNED error
    await TestValidator.error("banned user cannot refresh token", async () => {
      const bannedRefreshConnection: api.IConnection = {
        host: connection.host,
      };
      await api.functional.discussionBoard.auth.user.refresh(
        bannedRefreshConnection,
        {
          body: {
            refresh_token: refreshToken,
          } satisfies IDiscussionBoardUser.IRefresh,
        },
      );
    });
  }
}
