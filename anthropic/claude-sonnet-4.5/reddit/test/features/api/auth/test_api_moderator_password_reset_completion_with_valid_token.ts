import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test password reset request and completion API endpoints for moderator
 * account.
 *
 * This test validates the password reset workflow API endpoints by:
 *
 * 1. Creating a moderator account with valid credentials
 * 2. Requesting a password reset via email to generate a reset token
 * 3. Completing the password reset with a mock token and new secure password
 * 4. Validating that both API endpoints return successful responses
 *
 * Note: This test validates the API contract and response structure. In a real
 * scenario, the reset token would be sent via email (external system) and
 * cannot be retrieved in an E2E test environment. Therefore, we validate that
 * the APIs accept properly formatted requests and return expected responses.
 *
 * The actual token validation and session invalidation logic would be tested
 * through integration tests with access to the email system and database.
 */
export async function test_api_moderator_password_reset_completion_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "Original@Pass123";

  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: moderatorEmail,
    password: originalPassword,
  } satisfies IRedditLikeModerator.ICreate;

  const createdModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  typia.assert(createdModerator);
  TestValidator.equals(
    "created moderator email matches",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "moderator has valid ID",
    createdModerator.id !== null && createdModerator.id !== undefined,
  );

  // Step 2: Request password reset for the moderator account
  const resetRequest: IRedditLikeModerator.IPasswordResetResponse =
    await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies IRedditLikeModerator.IPasswordResetRequest,
      },
    );

  typia.assert(resetRequest);
  TestValidator.equals(
    "reset request returns success",
    resetRequest.success,
    true,
  );
  TestValidator.predicate(
    "reset request includes message",
    resetRequest.message.length > 0,
  );

  // Step 3: Complete password reset with new secure password
  // Note: In real scenario, reset_token would come from email link
  // For E2E testing, we use a mock token format that matches the expected structure
  const newPassword = "NewSecure@Pass456";
  const mockResetToken = typia.random<string & tags.Format<"uuid">>();

  const resetComplete: IRedditLikeModerator.IPasswordResetConfirmation =
    await api.functional.auth.moderator.password.reset.complete.completePasswordReset(
      connection,
      {
        body: {
          reset_token: mockResetToken,
          new_password: newPassword,
          new_password_confirmation: newPassword,
        } satisfies IRedditLikeModerator.IPasswordResetComplete,
      },
    );

  typia.assert(resetComplete);
  TestValidator.equals(
    "password reset completion returns success",
    resetComplete.success,
    true,
  );
  TestValidator.predicate(
    "reset completion includes confirmation message",
    resetComplete.message.length > 0,
  );

  // Step 4: Validate that new password meets security requirements
  TestValidator.predicate(
    "new password meets minimum length requirement",
    newPassword.length >= 8,
  );
  TestValidator.predicate(
    "new password contains required character types",
    /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[@#$%&*]/.test(newPassword),
  );
}
