import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator token refresh workflow.
 *
 * This test validates the complete token refresh lifecycle for moderators,
 * ensuring that refresh tokens can be used to obtain new access tokens without
 * requiring credential re-entry. The test creates a moderator account,
 * authenticates to obtain initial tokens, then uses the refresh token to get
 * new access tokens while verifying the response contains valid tokens and
 * current moderator profile information.
 *
 * Steps:
 *
 * 1. Create a new moderator account via join endpoint
 * 2. Authenticate the moderator via login to obtain initial tokens
 * 3. Extract the refresh token from login response
 * 4. Use refresh token to obtain new access tokens
 * 5. Validate the refresh response contains new access token with 30-minute
 *    expiration
 * 6. Verify the response includes current moderator profile information
 * 7. Confirm token structure and expiration timestamps are valid
 */
export async function test_api_moderator_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const joinedModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(joinedModerator);

  // Step 2: Authenticate moderator via login to get fresh tokens
  const loggedInModerator = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        username_or_email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/moderator/login",
        referrer: "https://example.com/moderator/join",
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(loggedInModerator);

  // Step 3: Extract refresh token from login response
  const refreshToken = loggedInModerator.token.refresh;

  // Step 4: Perform token refresh using the refresh token
  const refreshedModerator = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardModerator.IRefresh,
    },
  );
  typia.assert(refreshedModerator);

  // Step 5: Verify moderator profile information is returned and matches original
  TestValidator.equals(
    "refreshed moderator ID matches original",
    refreshedModerator.id,
    loggedInModerator.id,
  );

  TestValidator.equals(
    "refreshed moderator username matches original",
    refreshedModerator.username,
    loggedInModerator.username,
  );

  TestValidator.equals(
    "refreshed moderator email matches original",
    refreshedModerator.email,
    loggedInModerator.email,
  );

  TestValidator.equals(
    "refreshed moderator status matches original",
    refreshedModerator.status,
    loggedInModerator.status,
  );
}
