import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator account registration workflow.
 *
 * This test validates the complete moderator onboarding process including:
 *
 * 1. Moderator account creation with valid credentials
 * 2. JWT authentication token generation (access and refresh tokens)
 * 3. Complete profile data returned with proper initial state
 * 4. Immediate authenticated access capability
 *
 * The moderator registration creates accounts for trusted administrators with
 * elevated privileges for content moderation. The account is created with
 * email_verified=false (requiring verification) but is_active=true (allowing
 * immediate login and access).
 */
export async function test_api_moderator_registration_successful(
  connection: api.IConnection,
) {
  // Step 1: Prepare registration data with valid credentials and session context
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 2: Execute moderator registration API call
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the complete response structure and types
  typia.assert(moderator);

  // Step 4: Verify moderator identity fields match input data
  TestValidator.equals(
    "registered email matches input",
    moderator.email,
    registrationData.email,
  );
  TestValidator.equals(
    "registered username matches input",
    moderator.username,
    registrationData.username,
  );
  TestValidator.equals(
    "display name matches input",
    moderator.display_name,
    registrationData.display_name,
  );

  // Step 5: Verify initial account status flags
  TestValidator.equals(
    "email_verified should be false initially",
    moderator.email_verified,
    false,
  );
  TestValidator.equals("account should be active", moderator.is_active, true);
  TestValidator.equals(
    "email_verified_at should be null initially",
    moderator.email_verified_at,
    null,
  );
  TestValidator.equals(
    "deleted_at should be null for active account",
    moderator.deleted_at,
    null,
  );

  // Step 6: Verify JWT token structure and properties
  const token: IAuthorizationToken = moderator.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token should be non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    token.refresh.length > 0,
  );

  // Step 7: Verify token expiration logic (access token expires before refresh token)
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "access token should expire before refresh token",
    expiredAt < refreshableUntil,
  );
}
