import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test token refresh with valid refresh token from active contributor account.
 *
 * This test validates that token refresh operations work correctly for active
 * contributor accounts. Since the available API endpoints do not include
 * account suspension functionality, this test focuses on validating the token
 * refresh mechanism itself:
 *
 * 1. Register a new contributor account with valid credentials
 * 2. Extract the refresh token from the successful registration response
 * 3. Verify the account is in 'active' status after registration
 * 4. Attempt to refresh the token using the valid refresh token
 * 5. Verify that new tokens are issued with proper expiration times
 * 6. Validate that invalid refresh tokens are properly rejected
 *
 * Note: Testing suspended account token refresh would require an API endpoint
 * to suspend accounts (e.g., PUT /admin/contributors/{id}/suspend), which is
 * not available in the current API specification. The refresh endpoint itself
 * validates account status server-side and rejects requests from non-active
 * accounts, but this validation cannot be directly tested without account
 * management endpoints.
 */
export async function test_api_contributor_token_refresh_with_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(8);
  const password = "SecurePass123!@";

  const registered: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(registered);

  // Step 2: Extract the refresh token
  const refreshToken = registered.token.refresh;

  // Step 3: Verify the account is active after registration
  TestValidator.equals(
    "account should be active after registration",
    registered.account_status,
    "active",
  );

  // Step 4: Attempt to refresh the token using the valid refresh token
  const refreshed: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.refresh(connection, {
      body: {
        refreshToken,
      } satisfies IDiscussionBoardContributor.IRefresh,
    });
  typia.assert(refreshed);

  // Step 5: Verify that new tokens were issued
  TestValidator.notEquals(
    "access token should be refreshed",
    refreshed.token.access,
    registered.token.access,
  );

  TestValidator.notEquals(
    "refresh token should be renewed",
    refreshed.token.refresh,
    registered.token.refresh,
  );

  // Step 6: Verify account status remains active
  TestValidator.equals(
    "account status should remain active after token refresh",
    refreshed.account_status,
    "active",
  );

  // Step 7: Verify token expiration times are set correctly
  TestValidator.predicate(
    "access token should have expiration time",
    refreshed.token.expired_at !== null &&
      refreshed.token.expired_at !== undefined,
  );

  TestValidator.predicate(
    "refresh token should have expiration time",
    refreshed.token.refreshable_until !== null &&
      refreshed.token.refreshable_until !== undefined,
  );

  // Step 8: Validate that invalid refresh tokens are rejected
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.contributor.refresh(connection, {
        body: {
          refreshToken: "invalid.refresh.token",
        } satisfies IDiscussionBoardContributor.IRefresh,
      });
    },
  );
}
