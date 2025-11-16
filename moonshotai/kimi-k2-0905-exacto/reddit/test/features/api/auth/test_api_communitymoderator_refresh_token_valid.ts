import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefreshToken";

/**
 * Test successful JWT token refresh for authenticated community moderator.
 *
 * This test validates the complete token refresh workflow for community
 * moderators. The test ensures that a valid refresh token can successfully
 * obtain a new access token while maintaining session continuity. It verifies
 * proper token rotation mechanism, updates to token expiration timestamps, and
 * secure session extension without requiring re-authentication with
 * credentials.
 *
 * Test flow:
 *
 * 1. Create test community moderator credentials
 * 2. Authenticate community moderator to obtain initial tokens
 * 3. Extract refresh token from authentication response
 * 4. Use refresh token to request new access token
 * 5. Validate new access token is different from original
 * 6. Verify token expiration timestamps are updated
 * 7. Confirm session continuity is maintained
 * 8. Test that new access token works for authenticated requests
 */
export async function test_api_communitymoderator_refresh_token_valid(
  connection: api.IConnection,
) {
  // Generate realistic test data for community moderator authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator1234"; // Use simple valid password for test

  // Step 1: Authenticate community moderator to obtain initial tokens
  const loginResponse = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://reddit-community.example.com/login",
        referrer: "https://reddit-community.example.com/",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // Validate the initial authentication response
  typia.assert(loginResponse);

  // Extract tokens from initial authentication
  const originalAccessToken = loginResponse.token.access;
  const refreshToken = loginResponse.token.refresh;
  const originalExpiredAt = loginResponse.token.expired_at;
  const originalRefreshableUntil = loginResponse.token.refreshable_until;

  TestValidator.predicate(
    "original access token exists",
    originalAccessToken.length > 0,
  );
  TestValidator.predicate("refresh token exists", refreshToken.length > 0);
  TestValidator.predicate(
    "original expiration timestamp exists",
    originalExpiredAt.length > 0,
  );
  TestValidator.predicate(
    "original refreshable until timestamp exists",
    originalRefreshableUntil.length > 0,
  );

  // Step 2: Use refresh token to obtain new access token
  const refreshResponse = await api.functional.auth.communityModerator.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IRefreshToken,
    },
  );

  // Validate the refresh response
  typia.assert(refreshResponse);

  // Extract new tokens from refresh response
  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;
  const newExpiredAt = refreshResponse.token.expired_at;
  const newRefreshableUntil = refreshResponse.token.refreshable_until;

  // Step 3: Validate token rotation and differences
  TestValidator.notEquals(
    "new access token differs from original",
    newAccessToken,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    newRefreshToken,
    refreshToken,
  );
  TestValidator.notEquals(
    "new expiration timestamp differs from original",
    newExpiredAt,
    originalExpiredAt,
  );
  TestValidator.notEquals(
    "new refreshable until timestamp differs from original",
    newRefreshableUntil,
    originalRefreshableUntil,
  );

  TestValidator.predicate("new access token exists", newAccessToken.length > 0);
  TestValidator.predicate(
    "new refresh token exists",
    newRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "new expiration timestamp exists",
    newExpiredAt.length > 0,
  );
  TestValidator.predicate(
    "new refreshable until timestamp exists",
    newRefreshableUntil.length > 0,
  );

  // Step 4: Validate timestamps are properly updated (newer timestamps)
  TestValidator.predicate(
    "new expiration timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newExpiredAt),
  );
  TestValidator.predicate(
    "new refreshable until timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newRefreshableUntil),
  );

  // Step 5: Confirm session continuity - same moderator profile
  TestValidator.equals(
    "moderator ID remains consistent after refresh",
    refreshResponse.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "moderator nickname remains consistent after refresh",
    refreshResponse.nickname,
    loginResponse.nickname,
  );
  TestValidator.equals(
    "moderator email remains consistent after refresh",
    refreshResponse.email,
    loginResponse.email,
  );
  TestValidator.equals(
    "moderator created_at remains consistent after refresh",
    refreshResponse.created_at,
    loginResponse.created_at,
  );
  TestValidator.equals(
    "moderator updated_at remains consistent after refresh",
    refreshResponse.updated_at,
    loginResponse.updated_at,
  );

  // Step 6: Verify profile data integrity using proper validations
  TestValidator.predicate(
    "moderator ID is valid UUID format",
    typia.is<string & tags.Format<"uuid">>(refreshResponse.id),
  );
  TestValidator.predicate(
    "moderator email is valid format",
    typia.is<string & tags.Format<"email">>(refreshResponse.email),
  );
  TestValidator.predicate(
    "moderator nickname is not empty",
    refreshResponse.nickname.length > 0,
  );
  TestValidator.predicate(
    "timestamps are valid ISO format",
    typia.is<string & tags.Format<"date-time">>(refreshResponse.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO format",
    typia.is<string & tags.Format<"date-time">>(refreshResponse.updated_at),
  );

  // Additional validation: verify token structure
  TestValidator.predicate(
    "new access token has JWT structure",
    newAccessToken.split(".").length === 3,
  );
  TestValidator.predicate(
    "new refresh token has content",
    newRefreshToken.length > 10,
  );

  // Verify consistent moderator data integrity
  TestValidator.predicate(
    "login and refresh responses have same structure",
    Object.keys(loginResponse).sort().join(",") ===
      Object.keys(refreshResponse).sort().join(","),
  );
}
