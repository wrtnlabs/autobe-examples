import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test token refresh functionality with valid and invalid refresh tokens.
 *
 * This test validates the moderator authentication system's token refresh
 * mechanism. It verifies that valid refresh tokens can obtain new access
 * tokens, and that invalid or malformed refresh tokens are properly rejected
 * with appropriate errors.
 *
 * Test steps:
 *
 * 1. Create a moderator account with registration credentials
 * 2. Authenticate the moderator to obtain initial tokens
 * 3. Extract and store the tokens for testing
 * 4. Test refresh with an invalid/malformed refresh token to verify error handling
 * 5. Test successful refresh with a valid refresh token
 * 6. Verify new access tokens are issued when using valid refresh tokens
 * 7. Validate token expiration times are properly updated
 */
export async function test_api_moderator_authentication_token_refresh_expired_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(10);
  const password = "SecurePassword123!";
  const href = "https://community.example.com/auth/register";
  const referrer = "https://community.example.com/";

  const joinResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Extract the initial tokens
  const initialTokens = joinResponse.token;
  typia.assert(initialTokens);

  // Step 3: Verify initial token structure
  TestValidator.predicate(
    "access token should be present",
    initialTokens.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present",
    initialTokens.refresh.length > 0,
  );

  // Step 4: Test refresh with invalid refresh token
  await TestValidator.error("invalid refresh token should fail", async () => {
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: "invalid.expired.malformed.token",
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  });

  // Step 5: Test successful refresh with valid refresh token
  const refreshResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: initialTokens.refresh,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 6: Verify new tokens were issued
  TestValidator.notEquals(
    "new access token should be different from initial one",
    refreshResponse.token.access,
    initialTokens.access,
  );

  // Step 7: Verify token expiration times are updated
  TestValidator.predicate(
    "new expiration time should be set",
    refreshResponse.token.expired_at !== initialTokens.expired_at,
  );

  TestValidator.predicate(
    "refresh token expiration should extend beyond initial",
    new Date(refreshResponse.token.refreshable_until) >=
      new Date(initialTokens.refreshable_until),
  );
}
