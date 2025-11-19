import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator account registration with valid credentials.
 *
 * This test validates the complete moderator registration flow by verifying
 * that a new moderator account is created successfully with the following
 * characteristics:
 *
 * - Account status is 'active'
 * - Moderation tier is set to 'full' (all moderation permissions)
 * - Email verification status is 'false' initially
 * - JWT tokens are returned with proper expiration times
 * - All required account fields are properly populated
 *
 * The test creates a moderator account with:
 *
 * 1. A unique, valid email address
 * 2. A strong password meeting complexity requirements (8+ chars with uppercase,
 *    lowercase, number, special char)
 * 3. A unique username (3-50 alphanumeric/underscore characters)
 *
 * Expected outcomes:
 *
 * - Response contains moderator ID (UUID), email, username
 * - Account status is 'active'
 * - Moderation tier is 'full'
 * - Email verified is false
 * - Token object contains access and refresh tokens
 * - Access token expiration is approximately 30 minutes from now
 * - Refresh token expiration is approximately 7 days from now
 */
export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  // Generate test data with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123!";
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  // Register moderator with valid credentials
  const registered: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        password,
        username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Validate response structure and content
  typia.assert(registered);

  // Verify email matches input
  TestValidator.equals(
    "moderator email matches input",
    registered.email,
    email,
  );

  // Verify username matches input
  TestValidator.equals(
    "moderator username matches input",
    registered.username,
    username,
  );

  // Verify account status is 'active'
  TestValidator.equals(
    "account status should be active",
    registered.account_status,
    "active",
  );

  // Verify moderation tier is 'full'
  TestValidator.equals(
    "moderation tier should be full",
    registered.moderation_tier,
    "full",
  );

  // Verify email is not verified initially
  TestValidator.equals(
    "email should not be verified initially",
    registered.email_verified,
    false,
  );

  // Verify last_login_at is null for newly created account
  TestValidator.equals(
    "last_login_at should be null for new account",
    registered.last_login_at,
    null,
  );

  // Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at should be null for active account",
    registered.deleted_at,
    null,
  );

  // Verify access token expiration is approximately 30 minutes in the future
  const expiredAt = new Date(registered.token.expired_at);
  const now = new Date();
  const diffMs = expiredAt.getTime() - now.getTime();
  const diffMinutes = diffMs / 1000 / 60;

  TestValidator.predicate(
    "access token should expire in approximately 30 minutes",
    diffMinutes >= 25 && diffMinutes <= 35,
  );

  // Verify refresh token expiration is approximately 7 days in the future
  const refreshableUntil = new Date(registered.token.refreshable_until);
  const diffMsRefresh = refreshableUntil.getTime() - now.getTime();
  const diffDays = diffMsRefresh / 1000 / 60 / 60 / 24;

  TestValidator.predicate(
    "refresh token should expire in approximately 7 days",
    diffDays >= 6.5 && diffDays <= 7.5,
  );
}
