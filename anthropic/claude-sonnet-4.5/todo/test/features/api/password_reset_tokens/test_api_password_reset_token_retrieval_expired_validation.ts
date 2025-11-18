import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset token request functionality.
 *
 * This test validates the password reset request API by:
 *
 * 1. Submitting a password reset request with a valid email address
 * 2. Verifying the API returns a successful response
 * 3. Validating the response structure using runtime type checking
 *
 * **Limitation Note:** The original test scenario requested validation of token
 * retrieval and expiration metadata (expires_at timestamp). However, this is
 * not possible through the public API because:
 *
 * - The password reset request endpoint returns only a generic message
 *   (ITodoListUser.IPasswordResetRequestResponse) for security reasons
 * - The token ID is never exposed to prevent token enumeration attacks
 * - The GET /todoList/passwordResetTokens/{tokenId} endpoint requires a token ID
 *   that cannot be obtained through the available public APIs
 *
 * Testing token retrieval with expiration validation would require:
 *
 * - Direct database access to retrieve token IDs
 * - Internal testing APIs not available in the public SDK
 * - System-level test utilities
 *
 * Therefore, this test focuses on what IS testable: the password reset request
 * flow and response type validation.
 */
export async function test_api_password_reset_token_retrieval_expired_validation(
  connection: api.IConnection,
) {
  // Generate a random email address for testing
  const email = typia.random<string & tags.Format<"email">>();

  // Request password reset with the generated email
  const response =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: email,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );

  // Validate the response structure and type
  // This ensures the API returns the correct response format
  typia.assert(response);
}
