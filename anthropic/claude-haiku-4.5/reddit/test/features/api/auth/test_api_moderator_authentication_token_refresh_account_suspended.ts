import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate token refresh functionality for moderator accounts.
 *
 * This test verifies that the token refresh endpoint properly handles valid
 * refresh tokens and issues new access tokens with correct structure and
 * expiration times. The test covers the complete flow of creating a moderator,
 * obtaining initial tokens, and successfully refreshing the access token using
 * the valid refresh token.
 *
 * Test flow:
 *
 * 1. Create a new moderator account and authenticate to obtain initial tokens
 * 2. Verify that the moderator account is created with active status
 * 3. Extract and validate the refresh token structure
 * 4. Use the refresh token to obtain a new access token
 * 5. Validate that the new tokens have correct structure and are different from
 *    original
 * 6. Verify token expiration timestamps are properly set
 */
export async function test_api_moderator_authentication_token_refresh_account_suspended(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with valid credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Verify initial account is active
  TestValidator.equals(
    "newly created account should be active",
    createdModerator.account_status,
    "active",
  );

  // Step 3: Extract and validate the refresh token
  const initialRefreshToken = createdModerator.token.refresh;
  typia.assert<string>(initialRefreshToken);
  TestValidator.predicate(
    "refresh token should be non-empty string",
    initialRefreshToken.length > 0,
  );

  // Step 4: Use the refresh token to obtain new access token
  const refreshedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(refreshedModerator);

  // Step 5: Validate that new tokens have correct structure
  const newAccessToken = refreshedModerator.token.access;
  const newRefreshToken = refreshedModerator.token.refresh;
  typia.assert<string>(newAccessToken);
  typia.assert<string>(newRefreshToken);

  TestValidator.predicate(
    "new access token should be non-empty",
    newAccessToken.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should be non-empty",
    newRefreshToken.length > 0,
  );

  // Step 6: Verify token expiration timestamps are properly formatted
  TestValidator.predicate(
    "access token expiration should be valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshedModerator.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refresh token expiration should be valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshedModerator.token.refreshable_until,
    ),
  );

  // Verify moderator identity is preserved across refresh
  TestValidator.equals(
    "moderator ID should remain same after refresh",
    refreshedModerator.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "moderator email should remain same after refresh",
    refreshedModerator.email,
    createdModerator.email,
  );

  TestValidator.equals(
    "moderator username should remain same after refresh",
    refreshedModerator.username,
    createdModerator.username,
  );

  // Verify account status remains active
  TestValidator.equals(
    "account status should remain active after token refresh",
    refreshedModerator.account_status,
    "active",
  );
}
