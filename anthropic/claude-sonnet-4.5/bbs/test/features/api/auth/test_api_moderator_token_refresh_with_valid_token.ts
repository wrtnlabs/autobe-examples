import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator access token refresh using a valid refresh token.
 *
 * This test validates the seamless token renewal workflow that prevents
 * frequent re-authentication during active moderation sessions. The test flow
 * includes:
 *
 * 1. Create a new moderator account with valid credentials
 * 2. Perform initial login to obtain access and refresh tokens
 * 3. Use the refresh token to request a new access token
 * 4. Verify the refresh operation returns a fresh access token
 * 5. Validate the new token maintains moderator identity and permissions
 * 6. Confirm the new access token is immediately usable for API operations
 */
export async function test_api_moderator_token_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const createData = {
    appointed_by_admin_id: adminId,
    username: RandomGenerator.alphaNumeric(10),
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: createData,
    },
  );
  typia.assert(createdModerator);

  // Step 2: Perform initial login to obtain tokens
  const loginData = {
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: loginData,
  });
  typia.assert(loginResponse);

  TestValidator.equals(
    "login should return same moderator ID",
    loginResponse.id,
    createdModerator.id,
  );

  const originalToken = loginResponse.token;
  typia.assert(originalToken);

  // Step 3: Use refresh token to obtain a new access token
  const refreshData = {
    refresh_token: originalToken.refresh,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const refreshResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: refreshData,
    },
  );
  typia.assert(refreshResponse);

  // Step 4: Verify refresh operation returns fresh access token
  TestValidator.equals(
    "refresh should return same moderator ID",
    refreshResponse.id,
    createdModerator.id,
  );

  const newToken = refreshResponse.token;
  typia.assert(newToken);

  // Step 5: Validate new token structure and expiration
  TestValidator.predicate(
    "new access token should be different from original",
    newToken.access !== originalToken.access,
  );

  TestValidator.predicate(
    "new token should have valid expired_at timestamp",
    new Date(newToken.expired_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "new token should have valid refreshable_until timestamp",
    new Date(newToken.refreshable_until).getTime() > Date.now(),
  );

  // Step 6: Confirm new access token is immediately usable by making another refresh
  // This proves the SDK automatically applied the new token and it works
  const secondRefreshData = {
    refresh_token: newToken.refresh,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const secondRefreshResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: secondRefreshData,
    },
  );
  typia.assert(secondRefreshResponse);

  TestValidator.equals(
    "second refresh should also return same moderator ID",
    secondRefreshResponse.id,
    createdModerator.id,
  );
}
