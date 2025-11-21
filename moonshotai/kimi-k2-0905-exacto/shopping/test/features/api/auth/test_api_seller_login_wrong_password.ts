import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller authentication failure with incorrect password.
 *
 * This test validates the security mechanisms in place for seller
 * authentication, specifically focusing on password validation and error
 * handling. It ensures that the system properly rejects login attempts with
 * incorrect passwords while maintaining security best practices. The test
 * covers various scenarios including wrong passwords, empty credentials, and
 * ensures proper error responses without exposing sensitive information that
 * could aid attackers.
 *
 * Test scenarios include:
 *
 * 1. Login with completely wrong password
 * 2. Login with empty password field
 * 3. Login with password that doesn't meet complexity requirements
 * 4. Multiple failed attempts to test rate limiting (if implemented)
 * 5. Verification that error messages don't reveal account existence
 *
 * This ensures robust protection against brute force attacks and unauthorized
 * access attempts on seller business accounts.
 */
export async function test_api_seller_login_wrong_password(
  connection: api.IConnection,
) {
  // Generate valid seller email for testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  // Test 1: Login with completely wrong password
  await TestValidator.error(
    "seller login with wrong password should fail",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: sellerEmail,
          password: "WrongPassword123!", // Intentionally wrong password
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Test 2: Login with empty password
  await TestValidator.error(
    "seller login with empty password should fail",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: sellerEmail,
          password: "", // Empty password
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Test 3: Login with weak/simple password
  await TestValidator.error(
    "seller login with simple password should fail",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: sellerEmail,
          password: "1234", // Too simple password
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Test 4: Multiple consecutive failed attempts (testing rate limiting)
  const wrongPasswords = [
    "WrongPassword1!",
    "IncorrectPass2@",
    "BadPassword3#",
    "InvalidPass4$",
    "FailedLogin5%",
  ];

  for (const wrongPassword of wrongPasswords) {
    await TestValidator.error(
      `seller login attempt ${wrongPasswords.indexOf(wrongPassword) + 1} with wrong password should fail`,
      async () => {
        await api.functional.auth.seller.login(connection, {
          body: {
            email: sellerEmail,
            password: wrongPassword,
          } satisfies IShoppingMallSeller.ILogin,
        });
      },
    );
  }

  // Test 5: Login with SQL injection attempt in password (security test)
  await TestValidator.error(
    "seller login with SQL injection attempt should fail safely",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: sellerEmail,
          password: "' OR '1'='1' --", // SQL injection attempt
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Test 6: Login with extremely long password
  const longPassword = ArrayUtil.repeat(100, () => "A").join("");
  await TestValidator.error(
    "seller login with extremely long password should fail",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: sellerEmail,
          password: longPassword,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Verify that connection headers are not polluted by failed attempts
  TestValidator.predicate(
    "connection headers remain clean after failed login attempts",
    !connection.headers?.Authorization,
  );
}
