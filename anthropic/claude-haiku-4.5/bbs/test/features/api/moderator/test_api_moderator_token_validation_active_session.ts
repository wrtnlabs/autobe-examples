import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful token validation for a moderator with an active session.
 *
 * This test validates the complete token validation workflow:
 *
 * 1. Moderator creates an account and receives JWT tokens
 * 2. Access token is automatically stored in connection headers
 * 3. Token validation endpoint verifies JWT signature, expiration, session, and
 *    account status
 * 4. Response contains complete moderator information and session details
 *
 * The validation process ensures:
 *
 * - JWT signature is valid using the configured signing secret
 * - Token has not expired (exp claim is in the future)
 * - Session exists and is active (expired_at is null)
 * - Moderator account status is 'active'
 * - All moderator details are correctly extracted from token and database
 */
export async function test_api_moderator_token_validation_active_session(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authorized);

  // Verify moderator account was created successfully
  TestValidator.predicate(
    "moderator should have valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );

  TestValidator.predicate(
    "moderator access token should be a non-empty string",
    authorized.token.access.length > 0,
  );

  TestValidator.equals(
    "moderator display name should match created data",
    authorized.moderator.display_name,
    moderatorData.display_name,
  );

  TestValidator.equals(
    "moderator account status should be active",
    authorized.moderator.account_status,
    "active",
  );

  // Step 2: Validate the access token
  const tokenValidationRequest = {
    token: authorized.token.access,
  } satisfies IDiscussionBoardModerator.IValidateToken;

  const validation: IDiscussionBoardModerator.ITokenValidation =
    await api.functional.discussionBoard.moderator.auth.moderator.validate_token.validateToken(
      connection,
      {
        body: tokenValidationRequest,
      },
    );
  typia.assert(validation);

  // Step 3: Verify token validation response
  TestValidator.predicate(
    "token validation should indicate valid token",
    validation.is_valid === true,
  );

  TestValidator.equals(
    "validated moderator id should match created moderator",
    validation.moderator_id,
    authorized.id,
  );

  TestValidator.predicate(
    "validated username should be a non-empty string",
    validation.username !== null &&
      validation.username !== undefined &&
      validation.username.length > 0,
  );

  TestValidator.equals(
    "validated display name should match",
    validation.display_name,
    authorized.moderator.display_name,
  );

  TestValidator.equals(
    "validated email should match created email",
    validation.email,
    moderatorData.email,
  );

  TestValidator.equals(
    "validated role should be moderator",
    validation.role,
    "moderator",
  );

  TestValidator.predicate(
    "email verified status should be boolean or null",
    validation.email_verified === null ||
      validation.email_verified === undefined ||
      typeof validation.email_verified === "boolean",
  );

  TestValidator.equals(
    "account status should be active",
    validation.account_status,
    "active",
  );

  TestValidator.predicate(
    "session id should be a valid UUID",
    validation.session_id !== null &&
      validation.session_id !== undefined &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        validation.session_id,
      ),
  );

  TestValidator.predicate(
    "session created at should be a valid ISO datetime",
    validation.session_created_at !== null &&
      validation.session_created_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        validation.session_created_at,
      ),
  );

  TestValidator.predicate(
    "token issued at should be a valid ISO datetime",
    validation.token_issued_at !== null &&
      validation.token_issued_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(validation.token_issued_at),
  );

  TestValidator.predicate(
    "token expires at should be a valid ISO datetime in the future",
    validation.token_expires_at !== null &&
      validation.token_expires_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        validation.token_expires_at,
      ) &&
      new Date(validation.token_expires_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "session creation timestamp should be valid and recent",
    validation.session_created_at !== null &&
      validation.session_created_at !== undefined &&
      Date.now() - new Date(validation.session_created_at).getTime() < 10000,
  );
}
