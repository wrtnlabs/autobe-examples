import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test correct refresh of JWT token for an authenticated todo_user.
 *
 * 1. Register a new user (join endpoint)
 * 2. Login as the user to obtain the initial JWT and refresh token
 * 3. Call /auth/user/refresh using the valid refresh token
 * 4. Assert the returned JWT and refresh token are valid, different from
 *    originals, and session continuity is upheld
 */
export async function test_api_user_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const randomEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: randomEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://localhost/join",
    referrer: "https://localhost/register",
  } satisfies ITodoUser.IJoin;
  const joined: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(joined);

  // Step 2: Login as this user to simulate real session token issuance
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: "https://localhost/login",
    referrer: "https://localhost/join",
  } satisfies ITodoUser.ILogin;
  const loginResult: ITodoUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: loginBody });
  typia.assert(loginResult);

  // Step 3: Refresh token with valid refresh_token
  const refreshBody = {
    refresh_token: loginResult.token.refresh,
  } satisfies ITodoUser.IRefresh;
  const refreshed: ITodoUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);

  // Step 4: Assertions
  TestValidator.equals(
    "user id remains constant",
    refreshed.id,
    loginResult.id,
  );
  TestValidator.equals(
    "user email remains constant",
    refreshed.email,
    loginResult.email,
  );
  TestValidator.notEquals(
    "access token changes",
    refreshed.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changes",
    refreshed.token.refresh,
    loginResult.token.refresh,
  );
  TestValidator.equals(
    "user is active (not deleted)",
    refreshed.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token expiration is valid future date",
    new Date(refreshed.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token expiration is valid future date",
    new Date(refreshed.token.refreshable_until).getTime() > Date.now(),
  );
}
