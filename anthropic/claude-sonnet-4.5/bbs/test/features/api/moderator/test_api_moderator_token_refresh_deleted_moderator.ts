import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh behavior for moderator accounts.
 *
 * Note: The original scenario requested testing token refresh failure for
 * deleted moderators. However, there is no delete API endpoint available in the
 * provided materials to soft-delete a moderator account. Therefore, this test
 * has been adapted to verify successful token refresh for an active moderator
 * account, which validates the normal token refresh workflow.
 *
 * Test Flow:
 *
 * 1. Create a new moderator account
 * 2. Login to obtain access and refresh tokens
 * 3. Use the refresh token to obtain new tokens
 * 4. Verify successful token refresh and validate response structure
 */
export async function test_api_moderator_token_refresh_deleted_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const createBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(createdModerator);

  // Verify moderator was created successfully
  TestValidator.equals(
    "created moderator email matches",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "created moderator username matches",
    createdModerator.username,
    moderatorUsername,
  );

  // Step 2: Login to obtain fresh tokens
  const loginBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Store the refresh token for the refresh operation
  const refreshToken = loginResponse.token.refresh;

  // Verify login response structure
  TestValidator.equals(
    "logged in moderator id matches",
    loginResponse.id,
    createdModerator.id,
  );

  // Step 3: Refresh tokens using the refresh token
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const refreshedResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedResponse);

  // Step 4: Verify successful token refresh
  TestValidator.equals(
    "refreshed moderator id matches original",
    refreshedResponse.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "refreshed moderator email matches",
    refreshedResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "refreshed moderator username matches",
    refreshedResponse.username,
    moderatorUsername,
  );

  // Verify new tokens were issued
  TestValidator.predicate(
    "new access token was issued",
    refreshedResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token was issued",
    refreshedResponse.token.refresh.length > 0,
  );
}
