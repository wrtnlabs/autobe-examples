import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that expired refresh tokens cannot be used to refresh access tokens.
 *
 * This test validates the token expiration mechanism for moderator refresh
 * tokens. Since refresh tokens have a 7-day validity period, expired tokens
 * should be rejected by the system, requiring moderators to perform a fresh
 * login.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account
 * 2. Login to obtain initial access and refresh tokens
 * 3. Attempt to refresh using an invalid/expired token
 * 4. Verify that the refresh operation fails with authentication error
 * 5. Confirm that a fresh login is required after token expiration
 */
export async function test_api_moderator_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const username = RandomGenerator.alphaNumeric(12);

  const createBody = {
    email: email,
    password: password,
    username: username,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: createBody,
  });
  typia.assert(moderator);

  // Step 2: Login to obtain tokens
  const loginBody = {
    email: email,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResult = await api.functional.auth.moderator.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // Step 3: Attempt to refresh with an invalid token to simulate expiration
  // Using a clearly invalid token string that would fail validation
  const invalidRefreshToken =
    "expired_or_invalid_token_" + RandomGenerator.alphaNumeric(50);

  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Step 4: Verify that a valid refresh token still works (confirming the system is functioning)
  const validRefreshBody = {
    refresh_token: loginResult.token.refresh,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const refreshedResult = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: validRefreshBody,
    },
  );
  typia.assert(refreshedResult);

  // Verify the refreshed result contains valid token information
  TestValidator.equals(
    "refreshed moderator ID matches",
    refreshedResult.id,
    moderator.id,
  );
  TestValidator.equals(
    "refreshed moderator email matches",
    refreshedResult.email,
    email,
  );
  TestValidator.predicate(
    "refreshed access token exists",
    refreshedResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token exists",
    refreshedResult.token.refresh.length > 0,
  );
}
