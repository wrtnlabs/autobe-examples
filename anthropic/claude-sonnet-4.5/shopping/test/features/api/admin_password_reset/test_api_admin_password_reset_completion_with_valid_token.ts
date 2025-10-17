import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin password reset request workflow.
 *
 * This test validates the password reset request flow for admin accounts. Due
 * to E2E testing limitations (no access to email system or database to retrieve
 * the generated reset token), this test focuses on validating:
 *
 * 1. Admin account creation with valid credentials
 * 2. Password reset request initiation and success response
 *
 * Note: Complete password reset validation (token usage, password update,
 * session invalidation) cannot be tested via E2E without access to the actual
 * reset token, which is sent via email and not returned by the API for security
 * reasons.
 *
 * The workflow tested:
 *
 * 1. Create an admin account with initial credentials
 * 2. Request a password reset for that admin account
 * 3. Verify the password reset request returns a success confirmation
 */
export async function test_api_admin_password_reset_completion_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123!";

  const createAdminBody = {
    email: adminEmail,
    password: initialPassword,
    name: RandomGenerator.name(),
    role_level: "order_manager",
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createAdminBody,
    });
  typia.assert(createdAdmin);

  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    adminEmail,
  );

  TestValidator.equals(
    "created admin role level matches input",
    createdAdmin.role_level,
    "order_manager",
  );

  // Step 2: Request password reset to generate a reset token
  const resetRequestBody = {
    email: adminEmail,
  } satisfies IShoppingMallAdmin.IPasswordResetRequest;

  const resetRequestResponse: IShoppingMallAdmin.IPasswordResetRequestResponse =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetRequestResponse);

  // Step 3: Verify the generic success message is returned
  TestValidator.predicate(
    "password reset request returns non-empty success message",
    typeof resetRequestResponse.message === "string" &&
      resetRequestResponse.message.length > 0,
  );
}
