import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that email verification fails with an invalid or expired token.
 *
 * This test checks that providing an incorrect verification token for a user
 * email, or using a token on an unregistered email address, always fails
 * gracefully and does not activate the user's account. It ensures the API does
 * not mistakenly allow account activation on bad tokens, which is critical for
 * security and correct registration logic.
 *
 * 1. Generate a validly-formatted email address.
 * 2. Submit a verification request with the email and a random (invalid) token.
 * 3. Confirm the API response contains success: false and an appropriate
 *    user_status value (such as "verification_failed", "token_expired", or any
 *    non-"active" value).
 * 4. Repeat using a random email-token pair that should never match.
 */
export async function test_api_auth_user_email_verify_invalid_token(
  connection: api.IConnection,
) {
  // 1. Generate a random valid email address and a random token
  const email = typia.random<string & tags.Format<"email">>();
  const token = RandomGenerator.alphaNumeric(32);

  // 2. Attempt verification with a random email and token (unregistered email)
  const result1 = await api.functional.auth.user.email.verify.verifyEmail(
    connection,
    {
      body: {
        email,
        email_verification_token: token,
      } satisfies ITodoListUser.IVerifyEmail,
    },
  );
  typia.assert(result1);
  TestValidator.equals(
    "verification attempt with random email and token should fail",
    result1.success,
    false,
  );
  TestValidator.predicate(
    "user_status is not 'active' after failed verification (random email)",
    result1.user_status !== "active",
  );

  // 3. Attempt verification with same email but a new random token (double-checks failure)
  const invalidToken2 = RandomGenerator.alphaNumeric(32);
  const result2 = await api.functional.auth.user.email.verify.verifyEmail(
    connection,
    {
      body: {
        email,
        email_verification_token: invalidToken2,
      } satisfies ITodoListUser.IVerifyEmail,
    },
  );
  typia.assert(result2);
  TestValidator.equals(
    "verification attempt with same email and different random token should fail",
    result2.success,
    false,
  );
  TestValidator.predicate(
    "user_status is not 'active' after failed verification (invalid token 2)",
    result2.user_status !== "active",
  );

  // 4. Attempt a clearly invalid scenario: structurally valid but random email (not a real user)
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherToken = RandomGenerator.alphaNumeric(32);
  const result3 = await api.functional.auth.user.email.verify.verifyEmail(
    connection,
    {
      body: {
        email: anotherEmail,
        email_verification_token: anotherToken,
      } satisfies ITodoListUser.IVerifyEmail,
    },
  );
  typia.assert(result3);
  TestValidator.equals(
    "verification attempt with random email and token (again) should fail",
    result3.success,
    false,
  );
  TestValidator.predicate(
    "user_status is not 'active' after failed verification (random again)",
    result3.user_status !== "active",
  );
}
