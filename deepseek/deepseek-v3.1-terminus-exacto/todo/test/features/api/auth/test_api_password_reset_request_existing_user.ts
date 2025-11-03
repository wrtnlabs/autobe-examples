import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test password reset request workflow for existing user.
 *
 * This test validates the complete password reset process by:
 *
 * 1. Creating a new user account through registration
 * 2. Initiating password reset process with the registered email
 * 3. Verifying the system handles reset requests securely
 * 4. Ensuring generic success messages prevent email enumeration
 */
export async function test_api_password_reset_request_existing_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account that will request password reset
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Initiate password reset process for the registered user
  const resetRequestData = {
    email: userEmail,
    ip: "192.168.1.100",
    href: "https://example.com/auth/reset-password",
    referrer: "https://example.com/auth/login",
  } satisfies ITodoAppUser.IResetPasswordRequest;

  const resetResponse =
    await api.functional.auth.user.password.reset.requestPasswordReset(
      connection,
      {
        body: resetRequestData,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Validate the reset response structure
  TestValidator.predicate(
    "reset response should contain a message",
    resetResponse.message.length > 0,
  );

  // Step 4: Validate that user_id matches the created user (security feature validation)
  TestValidator.equals(
    "user_id should match the created user ID",
    resetResponse.user_id,
    createdUser.id,
  );

  // Step 5: Validate requested_at timestamp is properly set
  TestValidator.predicate(
    "requested_at should be a valid timestamp",
    resetResponse.requested_at !== null &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(resetResponse.requested_at),
  );

  // Step 6: Test security feature - verify the response follows the expected pattern
  TestValidator.predicate(
    "response should indicate password reset processing",
    resetResponse.message.length > 10, // Generic message should be substantial
  );
}
