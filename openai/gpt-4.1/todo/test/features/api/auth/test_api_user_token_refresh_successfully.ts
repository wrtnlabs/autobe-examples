import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a registered and authenticated user can successfully refresh
 * their authentication tokens using a valid refresh token.
 *
 * 1. Register a new user (join) with random email and password and proper context
 *    (href, referrer, ip)
 * 2. Login as that user and obtain the initial access and refresh tokens
 * 3. Perform refresh with the valid refresh token
 * 4. Assert that the new access and refresh tokens differ from the previous ones
 * 5. Use the new refresh token to perform another refresh and validate tokens
 * 6. Edge case: Attempt a refresh with an invalid refresh token and expect an
 *    error response
 */
export async function test_api_user_token_refresh_successfully(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://test.todo-list.app/register";
  const referrer = "https://test.todo-list.app/welcome";
  const ip = "127.0.0.1";

  const joinResult = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password satisfies string as string,
      href,
      referrer,
      ip,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinResult);

  // 2. Login as the same user
  const loginResult = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password: password satisfies string as string,
      href: "https://test.todo-list.app/login",
      referrer: href,
      ip,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(loginResult);

  // 3. Refresh tokens with valid refresh token
  const refreshResult = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: loginResult.token.refresh,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(refreshResult);

  // 4. Assert that new tokens differ
  TestValidator.notEquals(
    "new access token should differ after refresh",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should differ after refresh",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );

  // 5. Use the new refresh token to refresh again and validate it changes
  const refresh2 = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: refreshResult.token.refresh,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(refresh2);
  TestValidator.notEquals(
    "access token changes with each refresh",
    refresh2.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changes with each refresh",
    refresh2.token.refresh,
    refreshResult.token.refresh,
  );

  // 6. Edge case: Attempt to refresh with invalid token (should fail)
  await TestValidator.error(
    "refresh with invalid refresh token should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "invalid-token-not-exist",
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}
