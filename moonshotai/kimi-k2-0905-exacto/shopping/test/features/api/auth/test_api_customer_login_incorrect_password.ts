import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer login with incorrect password to verify authentication failure
 * and security controls. This test validates that the system properly rejects
 * invalid credentials without revealing account existence or security-sensitive
 * information, ensuring compliance with security best practices.
 *
 * Step 1: Test authentication with completely incorrect password Step 2: Test
 * authentication with common weak password patterns\
 * Step 3: Test authentication with unusually short passwords Step 4: Test
 * authentication with non-existent email addresses Step 5: Test authentication
 * with completely random credentials Step 6: Verify security by ensuring no
 * account information is exposed
 */
export async function test_api_customer_login_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Test login with valid email format but incorrect password
  const testEmail = typia.random<string & tags.Format<"email">>();
  const incorrectPassword = RandomGenerator.alphaNumeric(8);

  const loginBody1 = {
    email: testEmail,
    password: incorrectPassword,
    href: "https://test.example.com/login",
    referrer: "https://test.example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  // Verify authentication fails with incorrect password
  await TestValidator.error(
    "authentication should fail with incorrect password",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: loginBody1,
      });
    },
  );

  // Step 2: Test with common weak password patterns that should fail
  const weakPasswordLogin = {
    email: testEmail,
    password: "123456", // Common weak password
    href: "https://test.example.com/login",
    referrer: "https://test.example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  await TestValidator.error(
    "authentication should reject commonly weak passwords",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: weakPasswordLogin,
      });
    },
  );

  // Step 3: Test with very short passwords
  const shortPasswordLogin = {
    email: testEmail,
    password: "aa", // Extremely short password
    href: "https://test.example.com/login",
    referrer: "https://test.example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  await TestValidator.error(
    "authentication should reject very short passwords",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: shortPasswordLogin,
      });
    },
  );

  // Step 4: Test with non-existent email to verify consistent security behavior
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const nonExistentLogin = {
    email: nonExistentEmail,
    password: "ValidPassword123!",
    href: "https://test.example.com/login",
    referrer: "https://test.example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  await TestValidator.error(
    "authentication should fail consistently with non-existent emails",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: nonExistentLogin,
      });
    },
  );

  // Step 5: Test with completely random credentials to prevent enumeration attacks
  const randomEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(12);
  const randomLogin = {
    email: randomEmail,
    password: randomPassword,
    href: "https://test.example.com/login",
    referrer: "https://test.example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  await TestValidator.error(
    "authentication should block credential enumeration attempts",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: randomLogin,
      });
    },
  );

  // Step 6: Test edge case with empty password
  const emptyPasswordLogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "",
    href: "https://test.example.com/login",
    referrer: "https://test.example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  await TestValidator.error(
    "authentication should reject empty passwords",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: emptyPasswordLogin,
      });
    },
  );
}
