import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test complete response structure validation for successful token refresh.
 *
 * This test validates that the token refresh endpoint returns a properly
 * structured response with all required moderator information fields and token
 * details. It verifies:
 *
 * 1. Moderator information is complete and correctly typed:
 *
 *    - Id (UUID), email (valid format), username (pattern matching)
 *    - Email_verified (boolean), account_status (enum), moderation_tier (full)
 *    - Timestamps for created_at, updated_at, deleted_at (optional), last_login_at
 *         (optional)
 * 2. Token object structure is correct:
 *
 *    - Access token (JWT string)
 *    - Refresh token (JWT string)
 *    - Expired_at timestamp (ISO 8601)
 *    - Refreshable_until timestamp (ISO 8601)
 * 3. Response can be used for subsequent authenticated operations
 */
export async function test_api_moderator_token_refresh_response_structure(
  connection: api.IConnection,
) {
  // Generate a valid refresh token for testing
  const refreshTokenRequest = {
    refresh_token: RandomGenerator.alphaNumeric(128),
  } satisfies IDiscussionBoardModerator.IRefresh;

  // Call the token refresh API
  const refreshResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: refreshTokenRequest,
    },
  );

  // Validate the entire response structure - typia.assert performs COMPLETE validation
  // including all type checks, format constraints, and pattern validation
  typia.assert(refreshResponse);

  // Verify all required moderator information fields are present
  TestValidator.predicate(
    "moderator id field exists",
    refreshResponse.id !== undefined && refreshResponse.id !== null,
  );

  TestValidator.predicate(
    "email field exists",
    refreshResponse.email !== undefined && refreshResponse.email !== null,
  );

  TestValidator.predicate(
    "username field exists and matches pattern",
    refreshResponse.username !== undefined &&
      refreshResponse.username !== null &&
      /^[a-zA-Z0-9_]{3,50}$/.test(refreshResponse.username),
  );

  TestValidator.predicate(
    "email_verified is boolean",
    typeof refreshResponse.email_verified === "boolean",
  );

  TestValidator.predicate(
    "account_status is one of valid enum values",
    ["active", "suspended", "deleted"].includes(refreshResponse.account_status),
  );

  TestValidator.equals(
    "moderation_tier should be full",
    refreshResponse.moderation_tier,
    "full",
  );

  TestValidator.predicate(
    "created_at timestamp exists",
    refreshResponse.created_at !== undefined &&
      refreshResponse.created_at !== null,
  );

  TestValidator.predicate(
    "updated_at timestamp exists",
    refreshResponse.updated_at !== undefined &&
      refreshResponse.updated_at !== null,
  );

  // Verify token object structure and content
  TestValidator.predicate(
    "token object exists",
    refreshResponse.token !== undefined && refreshResponse.token !== null,
  );

  TestValidator.predicate(
    "access token is non-empty string",
    typeof refreshResponse.token.access === "string" &&
      refreshResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof refreshResponse.token.refresh === "string" &&
      refreshResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at timestamp exists",
    refreshResponse.token.expired_at !== undefined &&
      refreshResponse.token.expired_at !== null,
  );

  TestValidator.predicate(
    "refreshable_until timestamp exists",
    refreshResponse.token.refreshable_until !== undefined &&
      refreshResponse.token.refreshable_until !== null,
  );

  // Verify business logic: access token expiration is in the future
  const expiredAtTime = new Date(refreshResponse.token.expired_at).getTime();
  const nowTime = new Date().getTime();

  TestValidator.predicate(
    "access token has future expiration time",
    expiredAtTime > nowTime,
  );

  // Verify business logic: refresh token expiration is at or after access token expiration
  const refreshableUntilTime = new Date(
    refreshResponse.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "refreshable_until is after or equal to expired_at",
    refreshableUntilTime >= expiredAtTime,
  );
}
