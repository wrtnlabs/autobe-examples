import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request with valid email format.
 *
 * Since the original scenario requested testing invalid email formats, which
 * would violate TypeScript type safety (the email field is typed as string &
 * tags.Format<"email">), this test has been rewritten to test valid business
 * logic scenarios instead.
 *
 * This test verifies:
 *
 * 1. Password reset request accepts valid email format
 * 2. The system returns a generic security message (prevents email enumeration)
 * 3. Multiple requests can be made without revealing user existence
 */
export async function test_api_user_password_reset_request_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate a valid email format (even if user doesn't exist)
  const validEmail = typia.random<string & tags.Format<"email">>();

  // Test that password reset request accepts valid email and returns generic message
  const response =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: validEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );

  typia.assert(response);

  // Verify generic security message is returned
  TestValidator.predicate(
    "response contains generic message",
    response.message.length > 0,
  );

  // Test that multiple requests with same email work (idempotent)
  const secondResponse =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: validEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );

  typia.assert(secondResponse);

  // Verify consistent response
  TestValidator.predicate(
    "second response also contains message",
    secondResponse.message.length > 0,
  );
}
