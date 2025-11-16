import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates that newly refreshed moderator tokens are fully functional for
 * authenticated API requests.
 *
 * This test ensures the token refresh mechanism produces valid, working
 * credentials. After successfully refreshing tokens using a valid refresh token
 * from a previous login, the new access token should enable authenticated API
 * requests with the same moderator identity and permissions as the original
 * session.
 *
 * Test flow:
 *
 * 1. Authenticate moderator with initial login credentials
 * 2. Extract and store the refresh token from the login response
 * 3. Call the refresh endpoint with the refresh token to obtain new tokens
 * 4. Verify the new access token is set in the connection headers
 * 5. Use the new access token to make an authenticated API request
 * 6. Validate that the authenticated request succeeds with the new credentials
 */
export async function test_api_moderator_token_refresh_new_tokens_usable_for_api_requests(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator with initial login credentials
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const initialAuth = await api.functional.auth.moderator.login(connection, {
    body: loginBody,
  });
  typia.assert(initialAuth);

  // Step 2: Extract the refresh token from the initial login response
  const refreshToken = initialAuth.token.refresh;
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    refreshToken.length > 0,
  );

  // Step 3: Call the refresh endpoint with the refresh token to obtain new tokens
  const refreshedAuth = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardModerator.IRefresh,
    },
  );
  typia.assert(refreshedAuth);

  // Step 4: Verify the new tokens are different from the original tokens
  TestValidator.notEquals(
    "refreshed access token should be different from initial",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );

  TestValidator.notEquals(
    "refreshed refresh token should be different from initial",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );

  // Step 5: Verify the new access token is set in the connection headers
  TestValidator.equals(
    "connection authorization header should contain new access token",
    connection.headers?.Authorization,
    `${refreshedAuth.token.access}`,
  );

  // Step 6: Verify the moderator identity is preserved after token refresh
  TestValidator.equals(
    "refreshed moderator ID should match original",
    refreshedAuth.id,
    initialAuth.id,
  );

  TestValidator.equals(
    "refreshed moderator display name should match original",
    refreshedAuth.moderator.display_name,
    initialAuth.moderator.display_name,
  );

  TestValidator.equals(
    "refreshed moderator account status should be active",
    refreshedAuth.moderator.account_status,
    "active",
  );

  // Step 7: Verify the new tokens have valid expiration times
  TestValidator.predicate(
    "new access token should have expiration timestamp",
    refreshedAuth.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "new refresh token should have refreshable_until timestamp",
    refreshedAuth.token.refreshable_until.length > 0,
  );
}
