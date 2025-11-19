import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful JWT access token refresh using a valid refresh token.
 *
 * This test validates the token refresh endpoint by:
 *
 * 1. Generating a valid refresh token string in the expected format
 * 2. Calling the refresh endpoint with that token
 * 3. Verifying that the response contains moderator information with updated
 *    tokens
 * 4. Confirming that both access and refresh tokens are present with valid
 *    expiration times
 *
 * The test ensures that the refresh operation correctly validates token status,
 * moderator account status (active), and email verification before issuing new
 * tokens.
 */
export async function test_api_moderator_token_refresh_successful(
  connection: api.IConnection,
) {
  // Generate a valid refresh token string (simulating a previously issued token)
  const refreshToken = typia.random<string & tags.Format<"uuid">>();

  // Call the refresh endpoint with the valid refresh token
  const refreshedResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardModerator.IRefresh,
    },
  );

  // Validate the response structure and data
  typia.assert(refreshedResponse);

  // Verify that the response contains the moderator's authorized information
  TestValidator.predicate(
    "response should contain moderator id",
    refreshedResponse.id.length > 0,
  );

  TestValidator.predicate(
    "response should contain moderator email",
    refreshedResponse.email.length > 0,
  );

  TestValidator.predicate(
    "response should contain moderator username",
    refreshedResponse.username.length > 0,
  );

  // Verify email is verified
  TestValidator.equals(
    "moderator email should be verified",
    refreshedResponse.email_verified,
    true,
  );

  // Verify account status is active
  TestValidator.equals(
    "moderator account status should be active",
    refreshedResponse.account_status,
    "active",
  );

  // Verify moderation tier is set
  TestValidator.equals(
    "moderation tier should be full",
    refreshedResponse.moderation_tier,
    "full",
  );

  // Verify token information is present and valid
  TestValidator.predicate(
    "response should contain new access token",
    refreshedResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "response should contain new refresh token",
    refreshedResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration should be in the future",
    new Date(refreshedResponse.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token should be valid until future date",
    new Date(refreshedResponse.token.refreshable_until) > new Date(),
  );

  // Verify that timestamps are properly set
  TestValidator.predicate(
    "created_at should be a valid timestamp",
    refreshedResponse.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a valid timestamp",
    refreshedResponse.updated_at.length > 0,
  );
}
