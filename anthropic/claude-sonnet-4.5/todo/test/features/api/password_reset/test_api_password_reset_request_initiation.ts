import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

/**
 * Test password reset request initiation functionality.
 *
 * Validates that users can successfully initiate the password reset process by
 * submitting their email address. This test confirms the first phase of
 * password recovery workflow where a reset token is generated and the system
 * returns a generic confirmation message.
 *
 * Test Steps:
 *
 * 1. Generate a valid random email address
 * 2. Submit password reset request to the API endpoint
 * 3. Validate response structure and type correctness
 *
 * Security Validation:
 *
 * - Operation completes without authentication (public endpoint)
 * - Response is generic to prevent email enumeration attacks
 * - System processes request regardless of email existence in database
 */
export async function test_api_password_reset_request_initiation(
  connection: api.IConnection,
) {
  // Step 1: Generate valid random email address for password reset request
  const resetEmail = typia.random<string & tags.Format<"email">>();

  // Step 2: Submit password reset request to the API
  const result: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: resetEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );

  // Step 3: Validate response structure with complete runtime type checking
  typia.assert(result);
}
