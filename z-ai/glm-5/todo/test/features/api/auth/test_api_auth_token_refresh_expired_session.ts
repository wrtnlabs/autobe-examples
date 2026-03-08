import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that token refresh is rejected when the session token has been
 * invalidated (used or expired).
 *
 * This test validates the token rotation security feature where refresh tokens
 * are single-use. After a successful refresh, the old refresh token becomes
 * invalid and should be rejected, similar to an expired session.
 *
 * Business Rules Tested:
 * - Refresh tokens are invalidated after successful use
 * - System rejects invalid/expired refresh tokens with authentication error
 * - Token rotation prevents reuse of old session tokens
 */
export async function test_api_auth_token_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {});
  typia.assert(initialAuth);
  const initialRefreshToken = initialAuth.token.refresh;
  // Step 2: Perform a successful token refresh
  // This creates a new session with a new token_identifier
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await api.functional.todoApp.auth.member.refresh(
    refreshConnection,
    {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // Verify new tokens were issued
  TestValidator.notEquals(
    "new refresh token should be different from old",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // Step 3: Attempt to refresh using the OLD (now invalid) refresh token
  // The old token has been invalidated by the refresh operation above
  // This simulates the behavior of an expired session
  await TestValidator.error(
    "refresh with invalidated token should fail",
    async () => {
      const expiredConnection: api.IConnection = { host: connection.host };
      await api.functional.todoApp.auth.member.refresh(expiredConnection, {
        body: {
          refreshToken: initialRefreshToken,
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
}
