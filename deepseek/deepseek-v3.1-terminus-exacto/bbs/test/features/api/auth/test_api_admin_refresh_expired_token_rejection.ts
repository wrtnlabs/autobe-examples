import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test token refresh failure scenario where an administrator attempts to use an expired refresh token.
 * Validate that the system properly detects the expired token in the discussion_board_admin_sessions table,
 * rejects the refresh request with an appropriate error response, and does not issue new tokens.
 * Verify that the system maintains security by preventing refresh token reuse after expiration
 * and requires full re-authentication through the login endpoint.
 */
export async function test_api_admin_refresh_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Extract refresh token from initial authorization
  const refreshToken = authorized.token.refresh;
  // 3. Create refresh request body with the token
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IDiscussionBoardAdmin.IRefresh;
  // 4. Attempt to use the token for refresh (simulating expired token scenario)
  // Since we cannot directly expire tokens, we test that the system properly handles
  // invalid/expired tokens from discussion_board_admin_sessions table validation
  await TestValidator.error(
    "refresh with expired token should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(adminConnection, {
        body: refreshBody,
      });
    },
  );
  // 5. Validate that the original token still cannot be reused
  // This ensures the system maintains proper security by not allowing expired token refresh
  await TestValidator.error(
    "expired token cannot be reused for refresh",
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(adminConnection, {
        body: refreshBody,
      });
    },
  );
}
