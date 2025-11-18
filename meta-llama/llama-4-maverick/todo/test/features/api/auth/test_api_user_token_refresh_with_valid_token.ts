import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test user can refresh authentication tokens using a valid refresh token
 * received from successful registration.
 *
 * Steps:
 *
 * 1. Register a new user via /auth/user/join, assert output shape
 * 2. Extract refresh token from authorized user response
 * 3. Call /auth/user/refresh with the valid refresh token
 * 4. Assert new access/refesh tokens issued and are different from the previous
 * 5. Confirm new tokens correspond to same user (id/email match, timestamps
 *    differ)
 */
export async function test_api_user_token_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // 1. Register new user
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/welcome", // simple test context
    referrer: "https://example.com/", // simple referrer
    ip: undefined,
  } satisfies ITodoUser.ICreate;
  const joined: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinReq },
  );
  typia.assert(joined);

  // 2. Extract refresh token and user identity
  const initialToken: IAuthorizationToken = joined.token;
  const refreshToken: string = initialToken.refresh;
  const userId: string = joined.id;
  const userEmail: string = joined.email;

  // 3. Call /auth/user/refresh with valid refresh token
  const refreshReq = {
    refresh_token: refreshToken,
  } satisfies ITodoUser.IRefresh;
  const refreshed: ITodoUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, { body: refreshReq });
  typia.assert(refreshed);

  // 4. Assert new tokens are different, but user identity is unchanged
  TestValidator.notEquals(
    "access token is rotated",
    refreshed.token.access,
    initialToken.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated",
    refreshed.token.refresh,
    initialToken.refresh,
  );
  TestValidator.equals("user id unchanged", refreshed.id, userId);
  TestValidator.equals("user email unchanged", refreshed.email, userEmail);

  // 5. Check new token contract, and that expiration datetimes make sense
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(refreshed.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    new Date(refreshed.token.refreshable_until).getTime() > Date.now(),
  );
}
