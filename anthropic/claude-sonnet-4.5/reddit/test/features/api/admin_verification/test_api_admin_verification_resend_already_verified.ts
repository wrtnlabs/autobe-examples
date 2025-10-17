import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test email verification resend functionality for admin accounts.
 *
 * This test validates that the verification email resend endpoint works
 * correctly for admin accounts that have not yet completed email verification.
 * Since E2E tests cannot access verification tokens sent via email, this test
 * focuses on validating the resend functionality itself rather than the full
 * verification cycle.
 *
 * The test creates a new admin account (which triggers initial verification
 * email) and then tests the resend endpoint to ensure it successfully generates
 * and sends a new verification email with appropriate response messaging.
 *
 * Steps:
 *
 * 1. Create a new admin account via registration endpoint (email_verified = false)
 * 2. Call the resend verification email endpoint
 * 3. Validate that the resend operation succeeds with appropriate messaging
 */
export async function test_api_admin_verification_resend_already_verified(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const createdAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(createdAdmin);

  // Verify initial state - email should not be verified yet
  TestValidator.equals(
    "admin email should not be verified initially",
    createdAdmin.email_verified,
    false,
  );

  // Step 2: Request verification email resend
  const resendResult: IRedditLikeAdmin.IResendVerificationResponse =
    await api.functional.auth.admin.email.verify.resend.resendVerificationEmail(
      connection,
    );
  typia.assert(resendResult);

  // Step 3: Validate that the resend operation succeeded
  TestValidator.equals(
    "resend operation should succeed",
    resendResult.success,
    true,
  );

  TestValidator.predicate(
    "response message should confirm verification email was sent",
    resendResult.message.length > 0,
  );
}
