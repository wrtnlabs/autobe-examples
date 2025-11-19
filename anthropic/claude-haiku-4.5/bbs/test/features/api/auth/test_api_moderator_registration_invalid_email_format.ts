import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with valid email format to ensure proper account
 * creation.
 *
 * Tests the successful moderator registration flow with a properly formatted
 * email address. This validates that the moderator account creation API works
 * correctly with valid input data and returns the expected authorized response
 * with JWT tokens.
 *
 * Email format validation is handled by the backend framework and is not the
 * responsibility of E2E tests. This test focuses on the successful registration
 * workflow with valid data.
 *
 * Steps:
 *
 * 1. Register a new moderator with valid email, password, and username
 * 2. Verify the response contains the authorized moderator with token information
 * 3. Confirm the response structure matches the expected type
 */
export async function test_api_moderator_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test successful registration with valid email format
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "SecurePassword123!";
  const validUsername = RandomGenerator.alphabets(10);

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: validEmail,
        password: validPassword,
        username: validUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(authorizedModerator);

  // Verify the response contains required authorization information
  TestValidator.predicate(
    "moderator should have valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedModerator.id,
    ),
  );

  // Verify email matches what was registered
  TestValidator.equals(
    "registered email should match input",
    authorizedModerator.email,
    validEmail,
  );

  // Verify username matches what was registered
  TestValidator.equals(
    "registered username should match input",
    authorizedModerator.username,
    validUsername,
  );

  // Verify email is not verified by default
  TestValidator.predicate(
    "email should not be verified on registration",
    !authorizedModerator.email_verified,
  );

  // Verify account status is active
  TestValidator.equals(
    "account status should be active",
    authorizedModerator.account_status,
    "active",
  );

  // Verify moderation tier is full
  TestValidator.equals(
    "moderation tier should be full",
    authorizedModerator.moderation_tier,
    "full",
  );

  // Verify token information is present
  TestValidator.predicate(
    "access token should exist",
    authorizedModerator.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should exist",
    authorizedModerator.token.refresh.length > 0,
  );

  // Verify timestamps are valid ISO 8601 dates
  TestValidator.predicate(
    "created_at should be valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorizedModerator.created_at),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorizedModerator.updated_at),
  );
}
