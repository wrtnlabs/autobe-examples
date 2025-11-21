import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer login with realistic authentication scenarios to verify proper
 * validation of actual business cases.
 *
 * This test simulates real-world login scenarios that might occur despite
 * having valid input types:
 *
 * 1. Authentication attempts with incorrect credentials (valid format, wrong
 *    values)
 * 2. Login attempts with non-existent accounts
 * 3. Authentication requests that might trigger security responses
 *
 * These scenarios test the actual authentication logic rather than TypeScript's
 * compile-time validation, which is the responsibility of the development
 * environment, not E2E tests.
 */
export async function test_api_customer_login_empty_credentials(
  connection: api.IConnection,
) {
  // Test with invalid credentials format combinations
  await TestValidator.error(
    "should reject authentication with invalid email format",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: "not-a-valid-email@invalid", // Format fails real validation
          password: "ValidPassword123!",
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Test with no existing account credentials (valid types, non-existent account)
  await TestValidator.error(
    "should reject authentication for non-existent account",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "ValidPassword123!",
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Test with extremely short placeholder credentials (security edge case)
  await TestValidator.error(
    "should reject authentication with weak/placeholder credentials",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: "a@b.c", // Valid email format but obviously placeholder
          password: "123",
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Test with known common fake/placeholder email patterns
  await TestValidator.error(
    "should reject authentication with test/fake account patterns",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: "test@example.com", // Common fake pattern
          password: "test123",
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Test with domain patterns that indicate automation/spam
  await TestValidator.error(
    "should reject authentication with suspicious email patterns",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: "user12345@tempmail.tld", // Temp email service pattern
          password: "temp123456",
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
}
