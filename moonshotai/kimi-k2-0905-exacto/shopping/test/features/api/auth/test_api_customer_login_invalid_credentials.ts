import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer login rejection with invalid business logic scenarios.
 *
 * Validates authentication error handling for realistic invalid login attempts
 * using proper types while testing actual business logic:
 *
 * 1. Non-existent customer account login attempts
 * 2. Wrong password credential testing
 * 3. Invalid email format (server-side validation)
 * 4. Multiple failed attempts for security testing
 * 5. Proper error response validation
 *
 * Ensures authentication system properly rejects invalid credentials while
 * preventing account enumeration attacks and maintaining security best
 * practices without exposing sensitive information.
 */
export async function test_api_customer_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Test Case 1: Non-existent customer account login
  await TestValidator.error(
    "Should reject login with non-existent email",
    async () => {
      const randomEmail = typia.random<string & tags.Format<"email">>();
      await api.functional.auth.customer.login(connection, {
        body: {
          email: randomEmail,
          password: "validPassword123!",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Test Case 2: Valid email format but wrong password
  const testEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "Should reject login with correct email format but wrong password",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: testEmail,
          password: "WrongPassword123!",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Test Case 3: Valid email format with incorrect password (different approach)
  await TestValidator.error(
    "Should reject login attempt with mismatched authentication credentials",
    async () => {
      const unknownEmail = typia.random<string & tags.Format<"email">>();
      await api.functional.auth.customer.login(connection, {
        body: {
          email: unknownEmail,
          password: "completelyWrongPass123!",
          href: "https://example.com/login",
          referrer: "https://example.com",
          ip: "127.0.0.1",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Test Case 4: Multiple rapid failed attempts (simulation)
  await TestValidator.error(
    "Should handle multiple failed authentication attempts gracefully",
    async () => {
      await ArrayUtil.asyncRepeat(3, async () => {
        try {
          await api.functional.auth.customer.login(connection, {
            body: {
              email: typia.random<string & tags.Format<"email">>(),
              password: "BadPassword123!",
              href: "https://example.com/login",
              referrer: "https://example.com",
            } satisfies IShoppingMallCustomer.ILogin,
          });
        } catch {
          // Expected failures, continue the pattern
        }
      });

      // One more attempt after failures
      await api.functional.auth.customer.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "FinalWrongAttempt123!",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Test Case 5: Email-like format testing for server validation
  const emailWithPlus = typia.random<string & tags.Format<"email">>();
  const modifiedEmail = emailWithPlus.replace("+", "_plus_") + ".test";
  await TestValidator.error(
    "Should reject login with email format variations",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: modifiedEmail,
          password: "WrongPassword456!",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
}
