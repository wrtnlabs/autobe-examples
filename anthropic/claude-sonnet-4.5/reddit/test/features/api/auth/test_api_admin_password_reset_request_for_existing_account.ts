import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Tests the password reset request workflow for an existing administrator
 * account.
 *
 * This test validates the forgot password functionality by creating a
 * registered admin account and then initiating a password reset request. The
 * test ensures that:
 *
 * 1. A new admin account is successfully registered with valid credentials
 * 2. The password reset request API accepts the registered admin email
 * 3. The system returns a proper success response indicating the reset email was
 *    sent
 * 4. The response structure matches the expected IPasswordResetRequestResponse
 *    format
 *
 * The password reset mechanism is critical for account recovery and should
 * generate a unique reset token with 1-hour expiration for security purposes.
 */
export async function test_api_admin_password_reset_request_for_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account with valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(createdAdmin);

  // Verify the admin was created successfully
  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "created admin username matches",
    createdAdmin.username,
    adminUsername,
  );
  TestValidator.predicate("admin has valid ID", createdAdmin.id.length > 0);

  // Step 2: Submit password reset request for the registered admin email
  const resetResponse =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies IRedditLikeAdmin.IPasswordResetRequest,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Validate the password reset response
  TestValidator.equals(
    "reset request returns success",
    resetResponse.success,
    true,
  );
  TestValidator.predicate(
    "reset response contains message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );
}
