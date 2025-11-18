import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test refreshing user authentication tokens (JWT access/refresh tokens) for a
 * valid, active session.
 *
 * 1. Register a new user using ITodoUser.ICreate and obtain initial tokens
 * 2. Call /auth/user/refresh with the initial refresh token, expecting a fresh
 *    ITodoUser.IAuthorized response
 * 3. Check that the returned token properties (access, refresh, expired_at,
 *    refreshable_until) are present and well-formed
 * 4. Confirm the user id/email does not change and timestamps are updated
 *    reasonably (tokens are rotated)
 * 5. Confirm the new refresh token is different from the old one
 * 6. Attempt to reuse the original (now-invalidated) refresh token with
 *    /auth/user/refresh, expecting error
 */
export async function test_api_user_token_refresh_valid_session(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail: string = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<256> & tags.Format<"email">
  >();
  const userPassword: string = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const registrationBody = {
    email: userEmail,
    password: userPassword,
    ip: null,
    href: "https://test.local/register",
    referrer: "https://test.local/login",
  } satisfies ITodoUser.ICreate;
  const initialAuth: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registrationBody });
  typia.assert(initialAuth);
  TestValidator.equals(
    "registered user email matches",
    initialAuth.email,
    userEmail,
  );
  // 2. Submit refresh token for valid session
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies ITodoUser.IRefresh;
  const refreshedAuth: ITodoUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, { body: refreshBody });
  typia.assert(refreshedAuth);
  // 3. Validate token output structure
  TestValidator.predicate(
    "access token present",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is ISO string",
    typeof refreshedAuth.token.expired_at === "string" &&
      refreshedAuth.token.expired_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "refreshable until is ISO string",
    typeof refreshedAuth.token.refreshable_until === "string" &&
      refreshedAuth.token.refreshable_until.endsWith("Z"),
  );
  // 4. User id/email do not change
  TestValidator.equals(
    "user id does not change",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "user email does not change",
    refreshedAuth.email,
    initialAuth.email,
  );
  // 5. New token values are distinct
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  // 6. Attempt to reuse old refresh token and expect error
  await TestValidator.error("old refresh token cannot be reused", async () => {
    await api.functional.auth.user.refresh(connection, { body: refreshBody });
  });
}
