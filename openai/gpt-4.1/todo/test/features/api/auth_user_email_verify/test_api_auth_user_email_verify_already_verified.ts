import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verifies that the /auth/user/email/verify endpoint properly handles attempts
 * to re-verify an already verified user account.
 *
 * This test simulates the scenario where a user who is already marked as
 * is_verified=true submits a verification request using their (already
 * registered & verified) email and any verification token. The expected
 * behavior is that the endpoint returns an unsuccessful response (success:
 * false), with user_status set to 'already_verified', and performs no changes
 * to the user account state.
 *
 * Steps:
 *
 * 1. Generate a random email address and verification token.
 * 2. Assume user is already verified (in a real flow, user registration &
 *    verification would be performed first; for this isolated scenario, we test
 *    the edge case directly).
 * 3. Attempt to verify the email using the endpoint with the email and a token.
 * 4. Assert that user_status is 'already_verified' and success is false.
 */
export async function test_api_auth_user_email_verify_already_verified(
  connection: api.IConnection,
) {
  // Step 1: Generate random email and token for simulation
  const email = typia.random<string & tags.Format<"email">>();
  const token = RandomGenerator.alphaNumeric(24);

  // Step 2: Attempt to verify email for an already-verified account
  const verifyBody = {
    email,
    email_verification_token: token,
  } satisfies ITodoListUser.IVerifyEmail;

  const result = await api.functional.auth.user.email.verify.verifyEmail(
    connection,
    {
      body: verifyBody,
    },
  );
  typia.assert(result);

  // Step 3: Assert expected outcome: success === false, user_status === "already_verified"
  TestValidator.equals(
    "verification should fail for already verified user",
    result.success,
    false,
  );
  TestValidator.equals(
    "user_status returns 'already_verified' for already verified accounts",
    result.user_status,
    "already_verified",
  );
}
