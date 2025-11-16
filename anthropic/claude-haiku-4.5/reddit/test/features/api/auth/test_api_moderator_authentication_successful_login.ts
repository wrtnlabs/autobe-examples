import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test successful moderator login with valid credentials.
 *
 * This test validates the complete authentication workflow for moderators:
 *
 * 1. Create a new moderator account via the join operation with valid credentials
 * 2. Authenticate using the moderator's email and password with session context
 * 3. Verify the login response contains all required moderator account details
 * 4. Validate JWT token structure including access and refresh tokens
 * 5. Confirm token expiration timestamps are properly set
 *
 * The test ensures moderators can successfully authenticate and receive valid
 * tokens for accessing moderation tools and community management operations.
 */
export async function test_api_moderator_authentication_successful_login(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account via join operation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = "SecurePassword123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joinResponse = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      href: href,
      referrer: referrer,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(joinResponse);

  TestValidator.equals(
    "moderator join response contains valid id",
    typeof joinResponse.id,
    "string",
  );
  TestValidator.equals(
    "moderator join response contains email",
    joinResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator join response contains username",
    joinResponse.username,
    moderatorUsername,
  );

  // Step 2: Authenticate using login with same credentials
  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: href,
      referrer: referrer,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Verify moderator account details in login response
  TestValidator.equals(
    "login response id matches join response",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "login response email matches",
    loginResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "login response username matches",
    loginResponse.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "account_status is active or pending_deletion",
    loginResponse.account_status === "active" ||
      loginResponse.account_status === "suspended" ||
      loginResponse.account_status === "pending_deletion" ||
      loginResponse.account_status === "deleted",
  );
  TestValidator.predicate(
    "karma_score is non-negative integer",
    loginResponse.karma_score >= 0,
  );

  // Step 4: Validate JWT token structure
  const tokenData = loginResponse.token;
  typia.assert(tokenData);

  TestValidator.predicate(
    "access token is non-empty string",
    typeof tokenData.access === "string" && tokenData.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof tokenData.refresh === "string" && tokenData.refresh.length > 0,
  );

  // Step 5: Validate token expiration timestamps
  const expiredAt = new Date(tokenData.expired_at);
  const refreshableUntil = new Date(tokenData.refreshable_until);
  const now = new Date();

  TestValidator.predicate("expired_at is a valid future date", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is a valid future date",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );

  // Step 6: Verify email_verified status
  TestValidator.predicate(
    "email_verified is boolean",
    typeof loginResponse.email_verified === "boolean",
  );

  // Step 7: Verify created_at and updated_at timestamps
  const createdAt = new Date(loginResponse.created_at);
  const updatedAt = new Date(loginResponse.updated_at);

  TestValidator.predicate("created_at is a valid past date", createdAt <= now);
  TestValidator.predicate(
    "updated_at is a valid past date or current date",
    updatedAt <= now,
  );
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    updatedAt >= createdAt,
  );
}
