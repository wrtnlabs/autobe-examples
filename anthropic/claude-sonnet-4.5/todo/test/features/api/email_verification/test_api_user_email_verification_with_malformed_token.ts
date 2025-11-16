import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";

/**
 * Test email verification input validation and security with malformed token
 * data.
 *
 * This test validates that the email verification endpoint properly handles and
 * rejects various types of malformed token inputs. It ensures robust input
 * validation, appropriate error handling, and security against injection
 * attacks.
 *
 * Test workflow:
 *
 * 1. Test with empty string token
 * 2. Test with whitespace-only token
 * 3. Test with extremely long token string
 * 4. Test with special characters and symbols
 * 5. Test with SQL injection attempt patterns
 * 6. Test with script injection attempts
 * 7. Verify all malformed inputs are rejected appropriately
 */
export async function test_api_user_email_verification_with_malformed_token(
  connection: api.IConnection,
) {
  // Test 1: Empty string token (this violates MinLength<1> constraint)
  // Note: This will be caught by TypeScript compilation, so we skip this test
  // as it cannot be represented with valid types

  // Test 2: Whitespace-only token
  await TestValidator.error(
    "whitespace-only token should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: "   ",
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );

  // Test 3: Extremely long token string (potential buffer overflow test)
  const extremelyLongToken = RandomGenerator.alphaNumeric(10000);
  await TestValidator.error(
    "extremely long token should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: extremelyLongToken,
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );

  // Test 4: Token with special characters
  const specialCharsToken = "!@#$%^&*(){}[]|\\:;\"'<>,.?/~`";
  await TestValidator.error(
    "token with special characters should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: specialCharsToken,
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );

  // Test 5: SQL injection attempt pattern
  const sqlInjectionToken = "' OR '1'='1' --";
  await TestValidator.error(
    "SQL injection pattern should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: sqlInjectionToken,
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );

  // Test 6: Another SQL injection variant
  const sqlInjectionToken2 = "1; DROP TABLE todo_list_email_verifications; --";
  await TestValidator.error(
    "SQL DROP TABLE injection should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: sqlInjectionToken2,
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );

  // Test 7: Script injection attempt
  const scriptInjectionToken = "<script>alert('XSS')</script>";
  await TestValidator.error(
    "script injection attempt should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: scriptInjectionToken,
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );

  // Test 8: Null byte injection attempt
  const nullByteToken = "valid_token\0malicious_data";
  await TestValidator.error(
    "null byte injection should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: nullByteToken,
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );

  // Test 9: Unicode control characters
  const unicodeControlToken = "token\u0000\u0001\u0002\u0003";
  await TestValidator.error(
    "unicode control characters should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: unicodeControlToken,
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );

  // Test 10: Path traversal attempt
  const pathTraversalToken = "../../../etc/passwd";
  await TestValidator.error(
    "path traversal pattern should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: pathTraversalToken,
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );

  // Test 11: Random valid-looking but invalid token
  const randomInvalidToken = RandomGenerator.alphaNumeric(64);
  await TestValidator.error(
    "random invalid token should be rejected",
    async () => {
      await api.functional.auth.user.email.verify.verifyEmail(connection, {
        body: {
          token: randomInvalidToken,
        } satisfies ITodoListEmailVerification.IVerify,
      });
    },
  );
}
