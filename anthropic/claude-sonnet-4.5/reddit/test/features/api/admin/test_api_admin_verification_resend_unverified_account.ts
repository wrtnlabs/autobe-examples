import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test verification email resend functionality for unverified admin account.
 *
 * This test validates that an administrator with an unverified email can
 * successfully request a new verification email. The test creates a new admin
 * account (which starts with email_verified set to false), then calls the
 * verification email resend endpoint to generate a new verification token with
 * a fresh 24-hour expiration.
 *
 * Test flow:
 *
 * 1. Create new admin account via join endpoint (email_verified is false by
 *    default)
 * 2. Verify the admin account was created with unverified email status
 * 3. Request verification email resend as the authenticated admin
 * 4. Validate the resend response confirms success
 */
export async function test_api_admin_verification_resend_unverified_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account with unverified email
  const adminCreateData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const createdAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(createdAdmin);

  // Step 2: Verify the admin account has unverified email status
  TestValidator.equals(
    "admin email should be unverified initially",
    createdAdmin.email_verified,
    false,
  );

  TestValidator.equals(
    "admin username matches",
    createdAdmin.username,
    adminCreateData.username,
  );

  TestValidator.equals(
    "admin email matches",
    createdAdmin.email,
    adminCreateData.email,
  );

  // Step 3: Request verification email resend
  const resendResponse: IRedditLikeAdmin.IResendVerificationResponse =
    await api.functional.auth.admin.email.verify.resend.resendVerificationEmail(
      connection,
    );
  typia.assert(resendResponse);

  // Step 4: Validate resend response
  TestValidator.equals(
    "resend response indicates success",
    resendResponse.success,
    true,
  );

  TestValidator.predicate(
    "resend response contains confirmation message",
    typeof resendResponse.message === "string" &&
      resendResponse.message.length > 0,
  );
}
