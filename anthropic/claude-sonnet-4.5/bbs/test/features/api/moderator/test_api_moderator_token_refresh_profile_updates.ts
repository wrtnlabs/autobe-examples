import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that token refresh returns current moderator profile information.
 *
 * This test validates that token refresh operations return the moderator
 * profile information from the database. The test creates a moderator account,
 * performs initial login to obtain tokens, then performs a token refresh
 * operation. The test verifies that the refreshed response contains the
 * complete moderator profile information with all fields properly populated,
 * ensuring clients receive consistent moderator data during token refresh
 * operations.
 *
 * Steps:
 *
 * 1. Create a new moderator account with profile data
 * 2. Login to obtain initial JWT tokens
 * 3. Perform token refresh using the refresh token
 * 4. Verify refreshed response contains complete profile information
 * 5. Verify new tokens were issued with proper structure
 */
export async function test_api_moderator_token_refresh_profile_updates(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with profile data
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "securePassword123";
  const initialUsername = RandomGenerator.name(1);
  const initialDisplayName = RandomGenerator.name(2);

  const createBody = {
    email: initialEmail,
    password: initialPassword,
    username: initialUsername,
    display_name: initialDisplayName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(createdModerator);

  // Verify initial profile data
  TestValidator.equals(
    "initial username matches",
    createdModerator.username,
    initialUsername,
  );
  if (
    createdModerator.display_name !== null &&
    createdModerator.display_name !== undefined
  ) {
    TestValidator.equals(
      "initial display_name matches",
      createdModerator.display_name,
      initialDisplayName,
    );
  }

  // Step 2: Login to obtain JWT tokens
  const loginBody = {
    email: initialEmail,
    password: initialPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResponse);

  // Store the refresh token for later use
  const refreshToken = loginResponse.token.refresh;

  // Step 3: Perform token refresh using the refresh token
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const refreshedResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: refreshBody,
    },
  );
  typia.assert(refreshedResponse);

  // Step 4: Verify refreshed response contains complete profile information
  TestValidator.equals(
    "refreshed moderator ID matches",
    refreshedResponse.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "refreshed email matches",
    refreshedResponse.email,
    initialEmail,
  );
  TestValidator.equals(
    "refreshed username matches",
    refreshedResponse.username,
    createdModerator.username,
  );

  // Verify display_name is consistent
  if (
    createdModerator.display_name !== null &&
    createdModerator.display_name !== undefined
  ) {
    TestValidator.equals(
      "refreshed display_name matches",
      refreshedResponse.display_name,
      createdModerator.display_name,
    );
  }

  // Step 5: Verify new tokens were issued
  TestValidator.predicate(
    "new access token differs from login token",
    refreshedResponse.token.access !== loginResponse.token.access,
  );
  TestValidator.equals(
    "moderator is_active status preserved",
    refreshedResponse.is_active,
    createdModerator.is_active,
  );
  TestValidator.equals(
    "moderator email_verified status preserved",
    refreshedResponse.email_verified,
    createdModerator.email_verified,
  );
}
