import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator token refresh workflow with valid refresh token.
 *
 * This test validates the complete token refresh flow for moderators:
 *
 * 1. Creates a new moderator account to obtain initial access and refresh tokens
 * 2. Uses the refresh token to request a new access token
 * 3. Verifies the new access token is issued with proper moderator credentials
 * 4. Confirms the refresh token remains valid for continued use
 *
 * The test ensures that moderators can maintain authenticated sessions by
 * refreshing expired access tokens without requiring password re-entry,
 * providing a seamless user experience while maintaining security through
 * short-lived access tokens (30-minute expiration) and longer-lived refresh
 * tokens (30-day expiration).
 */
export async function test_api_moderator_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account to obtain initial tokens
  const createData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: createData,
  });
  typia.assert(moderator);

  // Validate initial moderator registration response
  TestValidator.equals(
    "moderator username matches created username",
    moderator.username,
    createData.username,
  );
  TestValidator.equals(
    "moderator email matches created email",
    moderator.email,
    createData.email,
  );

  // Step 2: Extract refresh token from initial authorization
  const refreshToken = moderator.token.refresh;
  typia.assert<string>(refreshToken);

  // Step 3: Use refresh token to obtain new access token
  const refreshedModerator = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IRedditLikeModerator.IRefresh,
    },
  );
  typia.assert(refreshedModerator);

  // Step 4: Validate refreshed token response
  TestValidator.equals(
    "refreshed moderator ID matches original",
    refreshedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "refreshed moderator username matches original",
    refreshedModerator.username,
    moderator.username,
  );
  TestValidator.equals(
    "refreshed moderator email matches original",
    refreshedModerator.email,
    moderator.email,
  );

  // Step 5: Verify new access token is different (indicates refresh occurred)
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedModerator.token.access,
    moderator.token.access,
  );

  // Step 6: Verify refresh token remains the same
  TestValidator.equals(
    "refresh token remains unchanged",
    refreshedModerator.token.refresh,
    moderator.token.refresh,
  );

  // Step 7: Validate token structure
  typia.assert<IAuthorizationToken>(refreshedModerator.token);
}
