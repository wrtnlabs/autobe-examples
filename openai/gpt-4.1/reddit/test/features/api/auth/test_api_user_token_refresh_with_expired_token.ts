import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate secure rejection of refresh attempts with expired or invalid tokens.
 *
 * 1. Register a new user to obtain a valid refresh token.
 * 2. Intentionally invalidate the token (simulate expiration or corruption).
 * 3. Attempt token refresh with invalid/expired token.
 * 4. Validate that no new tokens are issued, and API returns a business-error.
 */
export async function test_api_user_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // 1. Register a new user and extract valid refresh token
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const joinedUser = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(joinedUser);
  const refreshToken = joinedUser.token.refresh;
  // 2. Tamper with the refresh token to simulate invalidation (e.g., append random string)
  const invalidToken = `${refreshToken}${RandomGenerator.alphaNumeric(8)}`;
  // 3. Attempt token refresh with invalid/expired token, expect error
  await TestValidator.error(
    "should reject refresh with expired or invalid token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refreshToken: invalidToken,
        } satisfies ICommunityPlatformUser.IRefresh,
      });
    },
  );
}
