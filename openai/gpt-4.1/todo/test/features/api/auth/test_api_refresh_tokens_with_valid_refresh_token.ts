import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test refreshing authentication tokens with a valid refresh token, ensuring
 * correct renewal and identity consistency.
 *
 * This test exercises the /auth/user/refresh endpoint by walking through the
 * complete business flow for session renewal:
 *
 * 1. Register a new user (via /auth/user/join) with random valid email and
 *    password
 * 2. Log in using the same credentials (via /auth/user/login) to obtain
 *    access/refresh tokens
 * 3. Call /auth/user/refresh with the valid refresh_token from login step
 * 4. Assert:
 *
 * - New access and refresh tokens are returned (differ from before)
 * - Expired_at and refreshable_until fields are advanced
 * - User id and email remain unchanged
 * - Response structure matches ITodoListUser.IAuthorized
 * - Tokens are not merely echoed back but are properly rotated per business rules
 */
export async function test_api_refresh_tokens_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const registerBody = { email, password } satisfies ITodoListUser.ICreate;
  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registerBody });
  typia.assert(registered);
  TestValidator.equals(
    "registered user email matches input",
    registered.email,
    email,
  );

  // 2. Log in to get original tokens
  const loginBody = {
    email,
    password,
    href: "https://todolist.example.com/auth",
    referrer: "https://todolist.example.com/",
  } satisfies ITodoListUser.ILogin;
  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.login(
    connection,
    { body: loginBody },
  );
  typia.assert(auth);
  TestValidator.equals(
    "login returns same user id as register",
    auth.id,
    registered.id,
  );
  TestValidator.equals("login user email matches", auth.email, email);

  // 3. Perform token refresh with a valid refresh_token
  const refreshBody = {
    refresh_token: auth.token.refresh,
  } satisfies ITodoListUser.IRefresh;
  const refreshed: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);
  TestValidator.equals(
    "refreshed user id matches original",
    refreshed.id,
    auth.id,
  );
  TestValidator.equals(
    "refreshed user email matches original",
    refreshed.email,
    auth.email,
  );

  // 4. Validate new tokens returned and expiration advanced
  TestValidator.notEquals(
    "refreshed access token is rotated",
    refreshed.token.access,
    auth.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token is rotated",
    refreshed.token.refresh,
    auth.token.refresh,
  );
  TestValidator.notEquals(
    "refreshed access token expiry advanced",
    refreshed.token.expired_at,
    auth.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshed refreshable_until advanced",
    refreshed.token.refreshable_until,
    auth.token.refreshable_until,
  );
}
