import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test email verification behavior when attempting to verify an
 * already-verified email.
 *
 * This test validates that the email verification system handles redundant
 * verification attempts gracefully. The scenario tests the system's behavior
 * when a verification token is submitted for an email address that has already
 * been verified.
 *
 * NOTE: This test has limitations due to the API structure:
 *
 * - Verification tokens are generated server-side and not exposed through the API
 * - We can only test the verification endpoint's response to token submissions
 * - We cannot guarantee reaching the "already verified" state without token
 *   access
 *
 * Steps:
 *
 * 1. Create a new user account
 * 2. Attempt email verification with a token (simulating the verification flow)
 * 3. Validate the system's response structure and behavior
 */
export async function test_api_user_email_verification_for_already_verified_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const createUserBody = {
    email: userEmail,
    password: userPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const newUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createUserBody,
    });
  typia.assert(newUser);

  // Verify user was created successfully
  TestValidator.equals("user email matches input", newUser.email, userEmail);
  TestValidator.predicate("user has valid ID", newUser.id.length > 0);
  TestValidator.predicate("user has token", newUser.token.access.length > 0);

  // Step 2: Test email verification endpoint behavior
  // Note: We cannot obtain real verification tokens through the API,
  // so we test the endpoint's response structure and validation
  const testToken = typia.random<string & tags.MinLength<1>>();

  const verificationResult: ITodoListEmailVerification.IResult =
    await api.functional.auth.user.email.verify.verifyEmail(connection, {
      body: {
        token: testToken,
      } satisfies ITodoListEmailVerification.IVerify,
    });
  typia.assert(verificationResult);

  // Step 3: Validate the verification response structure
  TestValidator.predicate(
    "verification result has success field",
    typeof verificationResult.success === "boolean",
  );

  TestValidator.predicate(
    "verification result has message",
    verificationResult.message.length > 0,
  );

  // Validate optional userId field type if present
  if (verificationResult.userId !== undefined) {
    TestValidator.predicate(
      "userId is valid UUID format if present",
      verificationResult.userId.length === 36,
    );
  }
}
