import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration and JWT token generation.
 *
 * Verifies that successful moderator registration with valid credentials
 * correctly generates JWT tokens with proper structure and expiration times.
 * Validates that the access token has 30-minute expiration and refresh token
 * has 7-day expiration. Confirms tokens are properly formatted as valid JWTs
 * and contain correct moderator identification and expiration timestamps.
 *
 * This test ensures:
 *
 * 1. Moderator can successfully register with email, password, and username
 * 2. Response includes IAuthorizationToken with access and refresh tokens
 * 3. Access token expires in approximately 30 minutes
 * 4. Refresh token expires in approximately 7 days
 * 5. Both expired_at and refreshable_until are valid ISO 8601 timestamps
 * 6. Moderator account is created with correct details and 'active' status
 * 7. Email verification is initially false as per specification
 */
export async function test_api_moderator_registration_token_generation(
  connection: api.IConnection,
) {
  // Generate test moderator credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "TestPassword123!";

  // Register new moderator
  const registered: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        password,
        username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Validate response structure and moderator account
  typia.assert(registered);
  TestValidator.equals(
    "moderator email matches input",
    registered.email,
    email,
  );
  TestValidator.equals(
    "moderator username matches input",
    registered.username,
    username,
  );
  TestValidator.equals(
    "moderator account is active",
    registered.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator has full moderation tier",
    registered.moderation_tier,
    "full",
  );
  TestValidator.equals(
    "email not verified at registration",
    registered.email_verified,
    false,
  );

  // Validate token structure
  const token: IAuthorizationToken = registered.token;
  typia.assert(token);

  // Validate expiration timestamps
  const now = new Date();
  const expiredAtDate = new Date(token.expired_at);
  const refreshableUntilDate = new Date(token.refreshable_until);

  // Access token should expire in approximately 30 minutes (1800 seconds)
  const accessTokenExpiryMinutes =
    (expiredAtDate.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    accessTokenExpiryMinutes >= 25 && accessTokenExpiryMinutes <= 35,
  );

  // Refresh token should expire in approximately 7 days
  const refreshTokenExpiryDays =
    (refreshableUntilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token expires in approximately 7 days",
    refreshTokenExpiryDays >= 6.5 && refreshTokenExpiryDays <= 7.5,
  );

  // Verify refresh token expiration is after access token expiration
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );

  // Verify the token was set in connection headers for subsequent authenticated requests
  TestValidator.equals(
    "access token set in connection headers",
    connection.headers?.Authorization,
    token.access,
  );
}
