import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthRefresh";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the token refresh functionality for a logged-in moderator.
 *
 * This test covers the complete flow from moderator registration, login, to
 * refreshing authentication tokens.
 *
 * Steps:
 *
 * 1. Register a new moderator with valid inputs and assert the response.
 * 2. Login the moderator to get initial access and refresh tokens.
 * 3. Use the refresh token to get new access and refresh tokens.
 * 4. Assert that the new tokens differ from the old to confirm refresh success.
 * 5. Test error handling by attempting to refresh with an invalid refresh token.
 *
 * This comprehensive test ensures authentication renewal mechanisms work as
 * expected, providing a secure and user-friendly authentication system.
 */
export async function test_api_moderator_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register new moderator
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardModerator.ICreate;

  const joinResult = await api.functional.auth.moderator.join.joinModerator(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(joinResult);

  // 2. Login the moderator
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResult = await api.functional.auth.moderator.login.loginModerator(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loginResult);

  // Make sure tokens exist
  TestValidator.predicate(
    "loginResult has access token",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "loginResult has refresh token",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );

  // 3. Refresh tokens
  const refreshBody = {
    refreshToken: loginResult.token.refresh,
  } satisfies IAuthRefresh;

  const refreshResult =
    await api.functional.auth.moderator.refresh.refreshModerator(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResult);

  // 4. Validate new tokens are different from old
  TestValidator.notEquals(
    "New access token differs from old",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "New refresh token differs from old",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );

  TestValidator.predicate(
    "New access token is non-empty",
    typeof refreshResult.token.access === "string" &&
      refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "New refresh token is non-empty",
    typeof refreshResult.token.refresh === "string" &&
      refreshResult.token.refresh.length > 0,
  );

  // 5. Test error scenario with invalid refresh token
  const invalidRefreshBody = {
    refreshToken: "invalid-refresh-token",
  } satisfies IAuthRefresh;

  await TestValidator.error(
    "refresh with invalid token throws error",
    async () => {
      await api.functional.auth.moderator.refresh.refreshModerator(connection, {
        body: invalidRefreshBody,
      });
    },
  );
}
