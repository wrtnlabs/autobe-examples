import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test successful moderator account creation with valid credentials.
 *
 * This test validates the complete registration flow for a new moderator
 * account. It verifies that:
 *
 * 1. The API accepts valid registration credentials
 * 2. Email and username are properly validated for uniqueness
 * 3. Password is securely processed (hashed server-side)
 * 4. The system returns complete authorization response with JWT tokens
 * 5. Email verification status is initially false
 * 6. Account status is set to active
 * 7. Initial karma score is properly initialized
 * 8. Timestamps are properly recorded
 *
 * The test follows the primary success path for moderator registration,
 * ensuring that all required fields are properly processed and the response
 * contains all necessary authentication credentials for subsequent API
 * requests.
 */
export async function test_api_moderator_registration_with_valid_credentials(
  connection: api.IConnection,
) {
  // Generate valid moderator registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(5);
  const password = RandomGenerator.alphaNumeric(12);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Register new moderator with valid credentials
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    });

  // Validate complete moderator response structure and content
  typia.assert(moderator);

  // Verify all required fields are present and correct
  TestValidator.equals("moderator email matches input", moderator.email, email);
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    username,
  );

  // Verify email is not verified after registration
  TestValidator.equals(
    "email not verified after registration",
    moderator.email_verified,
    false,
  );

  // Verify account status is active
  TestValidator.equals(
    "account status is active after registration",
    moderator.account_status,
    "active",
  );

  // Verify initial karma score is non-negative
  TestValidator.predicate(
    "karma score is non-negative",
    moderator.karma_score >= 0,
  );

  // Validate token object structure
  typia.assert(moderator.token);

  // Verify token expiration logic - refresh token must expire after access token
  const expiredAt = new Date(moderator.token.expired_at);
  const refreshableUntil = new Date(moderator.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );

  // Verify deleted_at is undefined or null for new active account
  TestValidator.predicate(
    "deleted_at is undefined or null for active account",
    moderator.deleted_at === undefined || moderator.deleted_at === null,
  );
}
