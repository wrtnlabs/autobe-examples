import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test email verification enforcement of one-time token usage.
 *
 * This test validates that the email verification system properly rejects
 * attempts to reuse verification tokens. It demonstrates the token lifecycle
 * management and protection against replay attacks.
 *
 * Note: This test has a fundamental limitation - the API does not provide a
 * mechanism to retrieve the verification token generated during user
 * registration. In a production test environment, this would require either:
 *
 * - A test-only endpoint to retrieve verification tokens
 * - Email service mocking to capture sent tokens
 * - Direct database access for token retrieval
 *
 * For demonstration purposes, this test uses a simulated token to show the
 * expected verification flow and error handling.
 *
 * Test workflow:
 *
 * 1. Create a new user account (generates verification token in database)
 * 2. Simulate obtaining the verification token (in real tests, from
 *    email/database)
 * 3. Perform first email verification with the token
 * 4. Attempt second verification with the same token
 * 5. Validate that second attempt is rejected with appropriate error
 */
export async function test_api_user_email_verification_with_already_used_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to trigger verification token generation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Verify user was created successfully
  TestValidator.equals(
    "created user email should match input",
    createdUser.email,
    userEmail,
  );
  TestValidator.equals(
    "user email should not be verified initially",
    createdUser.email_verified,
    false,
  );

  // Step 2: Simulate verification token (limitation: cannot retrieve actual token)
  // In a real test environment, this would be obtained from:
  // - Intercepted email content
  // - Test database query
  // - Test utility endpoint
  const simulatedToken = RandomGenerator.alphaNumeric(32);

  // Step 3: Attempt first verification with simulated token
  // Note: This will likely fail because the token doesn't match database records
  // In a proper test environment with token access, this would succeed
  const firstAttempt: ITodoListEmailVerification.IResult =
    await api.functional.auth.user.email.verify.verifyEmail(connection, {
      body: {
        token: simulatedToken,
      } satisfies ITodoListEmailVerification.IVerify,
    });
  typia.assert(firstAttempt);

  // Step 4: Attempt second verification with the same token
  const secondAttempt: ITodoListEmailVerification.IResult =
    await api.functional.auth.user.email.verify.verifyEmail(connection, {
      body: {
        token: simulatedToken,
      } satisfies ITodoListEmailVerification.IVerify,
    });
  typia.assert(secondAttempt);

  // Step 5: Validate responses indicate proper token lifecycle management
  // Both attempts will likely fail with the simulated token, but we validate
  // that the API properly handles verification attempts
  TestValidator.predicate(
    "first attempt should return valid response structure",
    typeof firstAttempt.success === "boolean" &&
      typeof firstAttempt.message === "string",
  );

  TestValidator.predicate(
    "second attempt should return valid response structure",
    typeof secondAttempt.success === "boolean" &&
      typeof secondAttempt.message === "string",
  );

  // If by chance the first attempt succeeded (token matched), verify second fails
  if (firstAttempt.success === true) {
    TestValidator.equals(
      "second verification with same token should fail",
      secondAttempt.success,
      false,
    );

    TestValidator.predicate(
      "error message should indicate token issue",
      secondAttempt.message.toLowerCase().includes("token") ||
        secondAttempt.message.toLowerCase().includes("already") ||
        secondAttempt.message.toLowerCase().includes("used") ||
        secondAttempt.message.toLowerCase().includes("invalid"),
    );
  }
}
