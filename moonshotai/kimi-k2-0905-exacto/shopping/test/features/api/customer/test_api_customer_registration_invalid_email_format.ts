import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer registration with invalid email formats
 *
 * This test validates that the customer registration endpoint properly rejects
 * various invalid email formats including:
 *
 * - Missing @ symbol
 * - Invalid domain formats
 * - Missing domain parts
 * - Special characters in wrong positions
 * - Multiple @ symbols
 * - Invalid domain extensions
 *
 * Each invalid format should trigger appropriate validation errors and prevent
 * account creation.
 */
export async function test_api_customer_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test various invalid email formats
  const invalidEmails = [
    "userexample.com", // Missing @ symbol
    "user@", // Missing domain
    "user", // No @ symbol
    "@example.com", // Missing local part
    "user@@example.com", // Multiple @ symbols
    "user@.com", // Missing domain name
    "user@example", // Missing domain extension
    "user@example.c", // Domain extension too short
    "user user@example.com", // Spaces in local part
    "user@exam ple.com", // Spaces in domain
    "user..user@example.com", // Consecutive dots
    ".user@example.com", // Starting dot
    "user.@example.com", // Ending dot
    "user@-example.com", // Domain starting with hyphen
    "user@example.com-", // Domain ending with hyphen
    "user@example..com", // Consecutive dots in domain
    "user@example", // Missing top-level domain
    "user@example.c", // Invalid TLD
  ];

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    const requestBody = {
      email: invalidEmail,
      password: "validPassword123",
      first_name: "John",
      last_name: "Doe",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IRegister;

    // Expect registration to fail with invalid email
    await TestValidator.error(
      "registration should fail with invalid email format",
      async () => {
        await api.functional.auth.customer.join(connection, {
          body: requestBody,
        });
      },
    );
  }
}
