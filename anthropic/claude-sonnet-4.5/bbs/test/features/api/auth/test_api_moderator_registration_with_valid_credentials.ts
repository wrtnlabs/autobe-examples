import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with valid credentials.
 *
 * This test validates the complete moderator account registration workflow. It
 * submits valid registration data including a unique username, email, and
 * secure password, then verifies that the system creates a new moderator
 * account with the correct initial state and returns valid JWT authentication
 * tokens.
 *
 * Steps:
 *
 * 1. Generate valid registration credentials
 * 2. Submit registration request to the API
 * 3. Validate response structure and type safety
 * 4. Verify account status is pending_email_verification
 * 5. Verify email_verified is false
 * 6. Verify JWT tokens are present with correct structure
 * 7. Verify default profile settings are applied
 * 8. Verify registration data matches response
 * 9. Verify token expiration timestamps are valid
 * 10. Verify moderation_permissions field is present
 */
export async function test_api_moderator_registration_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Generate valid registration credentials
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecureP@ss123";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const registrationData = {
    username,
    email,
    password,
    href,
    referrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 2: Submit registration request to the API
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate response structure and type safety
  typia.assert(moderator);

  // Step 4: Verify account status is pending_email_verification
  TestValidator.equals(
    "moderator status should be pending_email_verification",
    moderator.status,
    "pending_email_verification",
  );

  // Step 5: Verify email_verified is false
  TestValidator.equals(
    "email_verified should be false",
    moderator.email_verified,
    false,
  );

  // Step 6: Verify JWT tokens are present with correct structure
  typia.assert<IAuthorizationToken>(moderator.token);

  TestValidator.predicate(
    "access token should be non-empty string",
    moderator.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be non-empty string",
    moderator.token.refresh.length > 0,
  );

  // Step 7: Verify default profile settings are applied
  TestValidator.equals(
    "profile_visibility should default to public",
    moderator.profile_visibility,
    "public",
  );

  TestValidator.equals(
    "activity_visibility should default to public",
    moderator.activity_visibility,
    "public",
  );

  // Step 8: Verify registration data matches response
  TestValidator.equals(
    "username should match registration data",
    moderator.username,
    username,
  );

  TestValidator.equals(
    "email should match registration data",
    moderator.email,
    email,
  );

  // Step 9: Verify token expiration timestamps are valid
  TestValidator.predicate(
    "token expired_at should be in the future",
    new Date(moderator.token.expired_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "token refreshable_until should be in the future",
    new Date(moderator.token.refreshable_until).getTime() > Date.now(),
  );

  // Step 10: Verify moderation_permissions field is present
  TestValidator.predicate(
    "moderation_permissions should be non-empty string",
    moderator.moderation_permissions.length > 0,
  );
}
