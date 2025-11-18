import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user account activation via email verification using valid credentials.
 *
 * This scenario emulates a user completing the registration process by
 * submitting their correct email and associated verification token to activate
 * the account. On success, the endpoint should report a successful operation,
 * the user's status should indicate activation, and the verification fields
 * should be cleared.
 *
 * Steps:
 *
 * 1. Generate a valid test email and random token.
 * 2. Call the verification endpoint with that email and token.
 * 3. Assert that the result is success and the status string indicates the account
 *    is active.
 */
export async function test_api_auth_user_email_verify_success(
  connection: api.IConnection,
) {
  // 1. Generate a valid test email and token
  const email = typia.random<string & tags.Format<"email">>();
  const token = RandomGenerator.alphaNumeric(24);
  const requestBody = {
    email,
    email_verification_token: token,
  } satisfies ITodoListUser.IVerifyEmail;

  // 2. Call the verification endpoint
  const response = await api.functional.auth.user.email.verify.verifyEmail(
    connection,
    {
      body: requestBody,
    },
  );
  typia.assert<ITodoListUser.IVerificationResult>(response);

  // 3. Assert that the result indicates email account activation
  TestValidator.predicate(
    "email verification is successful",
    response.success === true,
  );
  TestValidator.equals(
    "user status set to active after verification",
    response.user_status,
    "active",
  );
}
