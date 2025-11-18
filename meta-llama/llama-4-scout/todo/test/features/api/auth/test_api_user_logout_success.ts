import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensures that a successfully authenticated user can completely log out,
 * invalidating all existing sessions and tokens, by registering a user,
 * performing authentication, logout, and attempting access after logout to
 * ensure session invalidation.
 *
 * Steps:
 *
 * 1. Register a new user via join (creates an authenticated session).
 * 2. Call logout and validate response is {success: true}.
 * 3. Attempt to perform protected action with the old (now invalidated) token
 *    (should fail).
 * 4. Check that all sessions for this user have been invalidated (if possible).
 */
export async function test_api_user_logout_success(
  connection: api.IConnection,
) {
  // 1. Register a new user to obtain a session/token
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ITodoListUser.IJoin;

  const joinResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registrationBody });
  typia.assert(joinResult);
  TestValidator.equals(
    "User is verified (since no verification endpoint exists in flow)",
    joinResult.is_verified,
    true,
  );
  TestValidator.equals("User is active", joinResult.is_active, true);
  const previousAccessToken = joinResult.token.access;

  // 2. Call logout
  const logoutResult: ITodoListUser.ILogoutResult =
    await api.functional.auth.user.logout(connection);
  typia.assert(logoutResult);
  TestValidator.equals(
    "Logout response indicates success",
    logoutResult.success,
    true,
  );

  // 3. Attempt to call logout again (with now invalid/expired token) - should fail
  // Create a new connection object carrying the old/invalidated token
  const staleConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: previousAccessToken },
  };
  await TestValidator.error(
    "Accessing logout with invalid(ated) token after prior logout should fail",
    async () => {
      await api.functional.auth.user.logout(staleConnection);
    },
  );

  // 4. Further direct session listing is not possible (no API for session introspection).
}
