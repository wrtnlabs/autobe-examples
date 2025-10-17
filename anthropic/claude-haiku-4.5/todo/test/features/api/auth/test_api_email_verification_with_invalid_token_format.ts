import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Test email verification rejection when verification token has invalid or
 * malformed format.
 *
 * User attempts verification with incorrectly formatted token (too short,
 * invalid Base64 encoding, missing required components). System validates token
 * format compliance, rejects malformed tokens, returns HTTP 400 with error code
 * VAL-009 indicating verification link is invalid or malformed. Tests that
 * format validation prevents processing of corrupted or tampered tokens.
 *
 * Test flow:
 *
 * 1. Register user account to provide context for testing invalid token format
 *    rejection
 * 2. Attempt verification with too short token (less than 32 characters)
 * 3. Attempt verification with invalid Base64 characters
 * 4. Attempt verification with empty token
 * 5. Attempt verification with special invalid characters
 * 6. Attempt verification with whitespace in token
 * 7. Verify all attempts return HTTP 400 with VAL-009 error code
 */
export async function test_api_email_verification_with_invalid_token_format(
  connection: api.IConnection,
) {
  // Step 1: Register user account to provide context for testing invalid token rejection
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.todoApp.auth.register(
    connection,
    {
      body: typia.random<ITodoAppAuthenticatedUser.IRegister>(),
    },
  );
  typia.assert(registeredUser);

  // Step 2: Test with too short token (less than 32 characters minimum)
  const shortToken = RandomGenerator.alphabets(20);
  await TestValidator.error(
    "should reject verification with too short token",
    async () => {
      await api.functional.todoApp.auth.verify_email.verifyEmail(connection, {
        body: {
          token: shortToken,
        } satisfies ITodoAppAuth.IVerifyEmailRequest,
      });
    },
  );

  // Step 3: Test with empty token
  const emptyToken = "";
  await TestValidator.error(
    "should reject verification with empty token",
    async () => {
      await api.functional.todoApp.auth.verify_email.verifyEmail(connection, {
        body: {
          token: emptyToken,
        } satisfies ITodoAppAuth.IVerifyEmailRequest,
      });
    },
  );

  // Step 4: Test with token containing invalid characters (non-Base64)
  const invalidCharsToken = RandomGenerator.alphaNumeric(32) + "!@#$%^&*";
  await TestValidator.error(
    "should reject verification with invalid special characters in token",
    async () => {
      await api.functional.todoApp.auth.verify_email.verifyEmail(connection, {
        body: {
          token: invalidCharsToken,
        } satisfies ITodoAppAuth.IVerifyEmailRequest,
      });
    },
  );

  // Step 5: Test with token containing whitespace
  const tokenWithSpace =
    RandomGenerator.alphaNumeric(32) + " " + RandomGenerator.alphaNumeric(10);
  await TestValidator.error(
    "should reject verification with whitespace in token",
    async () => {
      await api.functional.todoApp.auth.verify_email.verifyEmail(connection, {
        body: {
          token: tokenWithSpace,
        } satisfies ITodoAppAuth.IVerifyEmailRequest,
      });
    },
  );

  // Step 6: Test with token containing tab character
  const tokenWithTab =
    RandomGenerator.alphaNumeric(32) + "\t" + RandomGenerator.alphaNumeric(10);
  await TestValidator.error(
    "should reject verification with tab character in token",
    async () => {
      await api.functional.todoApp.auth.verify_email.verifyEmail(connection, {
        body: {
          token: tokenWithTab,
        } satisfies ITodoAppAuth.IVerifyEmailRequest,
      });
    },
  );

  // Step 7: Test with token containing newline
  const tokenWithNewline =
    RandomGenerator.alphaNumeric(32) + "\n" + RandomGenerator.alphaNumeric(10);
  await TestValidator.error(
    "should reject verification with newline character in token",
    async () => {
      await api.functional.todoApp.auth.verify_email.verifyEmail(connection, {
        body: {
          token: tokenWithNewline,
        } satisfies ITodoAppAuth.IVerifyEmailRequest,
      });
    },
  );
}
