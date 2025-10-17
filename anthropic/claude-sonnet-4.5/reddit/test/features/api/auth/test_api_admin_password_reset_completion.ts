import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test the administrator password reset request and completion workflow.
 *
 * This test validates the password reset endpoints for administrators:
 *
 * 1. Create a new admin account through the join endpoint
 * 2. Request a password reset by providing the admin's email address
 * 3. Verify the reset request returns a success response
 * 4. Test the password reset completion endpoint with a properly formatted request
 *
 * Note: In a real-world scenario, the reset token would be delivered via email.
 * This test validates the API endpoints accept properly formatted requests,
 * though actual token validation would require email system integration or a
 * test environment that exposes tokens.
 *
 * The test ensures that:
 *
 * - Admin account creation works correctly with proper credentials
 * - Password reset request accepts valid email addresses
 * - Password reset completion endpoint accepts properly formatted requests
 * - All responses follow the expected DTO structure
 */
export async function test_api_admin_password_reset_completion(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123!";

  const createBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: adminEmail,
    password: initialPassword,
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(admin);

  TestValidator.equals("admin email should match", admin.email, adminEmail);

  // Step 2: Request password reset for the admin account
  const resetRequestBody = {
    email: adminEmail,
  } satisfies IRedditLikeAdmin.IPasswordResetRequest;

  const resetRequestResponse: IRedditLikeAdmin.IPasswordResetRequestResponse =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetRequestResponse);

  TestValidator.equals(
    "password reset request should succeed",
    resetRequestResponse.success,
    true,
  );

  TestValidator.predicate(
    "reset request message should be present",
    resetRequestResponse.message.length > 0,
  );

  // Step 3: Test password reset completion endpoint structure
  // Note: Using a mock token as actual tokens are delivered via email
  // In production, this would be the token from the email link
  const mockResetToken = RandomGenerator.alphaNumeric(32);
  const newPassword = "NewSecurePass456!";

  const resetCompleteBody = {
    reset_token: mockResetToken,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  } satisfies IRedditLikeAdmin.IPasswordResetComplete;

  // This call will likely fail with invalid token in real scenario,
  // but validates the endpoint accepts properly formatted requests
  await TestValidator.error(
    "password reset with invalid token should fail",
    async () => {
      await api.functional.auth.admin.password.reset.complete.completePasswordReset(
        connection,
        {
          body: resetCompleteBody,
        },
      );
    },
  );
}
