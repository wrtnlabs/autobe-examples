import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test refresh token rotation for moderator authentication.
 *
 * This test validates the security enhancement of refresh token rotation where
 * each refresh operation generates both a new access token and a new refresh
 * token while invalidating the old refresh token. This prevents token replay
 * attacks by ensuring refresh tokens can only be used once.
 *
 * Test workflow:
 *
 * 1. Create a moderator account with valid registration data
 * 2. Login to obtain initial access and refresh tokens
 * 3. Perform token refresh using the refresh token from login
 * 4. Verify new access and refresh tokens are returned (rotation occurred)
 * 5. Attempt to reuse the old (revoked) refresh token
 * 6. Confirm the second refresh attempt fails with authentication error
 */
export async function test_api_moderator_token_refresh_with_rotated_tokens(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

  const registrationData = {
    appointed_by_admin_id: adminId,
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ICreate;

  const registered = await api.functional.auth.moderator.join(connection, {
    body: registrationData,
  });
  typia.assert(registered);

  // Step 2: Login to obtain initial token set
  const loginData = {
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: loginData,
  });
  typia.assert(loginResponse);

  // Store the original refresh token for later reuse attempt
  const originalRefreshToken = loginResponse.token.refresh;
  const originalAccessToken = loginResponse.token.access;

  // Step 3: Perform token refresh with the original refresh token
  const firstRefreshData = {
    refresh_token: originalRefreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const firstRefreshResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: firstRefreshData,
    },
  );
  typia.assert(firstRefreshResponse);

  // Step 4: Verify token rotation occurred - new tokens should be different
  TestValidator.predicate(
    "new access token differs from original",
    firstRefreshResponse.token.access !== originalAccessToken,
  );
  TestValidator.predicate(
    "new refresh token differs from original",
    firstRefreshResponse.token.refresh !== originalRefreshToken,
  );

  // Step 5 & 6: Attempt to reuse the old refresh token - should fail
  await TestValidator.error(
    "old refresh token should be revoked and fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );
}
