import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer registration with invalid password formats to validate password
 * strength requirements and security policies. Ensures weak passwords are
 * rejected with appropriate error messages and that password complexity rules
 * are enforced during account creation.
 */
export async function test_api_customer_registration_invalid_password(
  connection: api.IConnection,
) {
  // Common valid customer data for testing
  const validFirstName = RandomGenerator.name();
  const validLastName = RandomGenerator.name();
  const validHref = "https://example.com/register";
  const validReferrer = "https://example.com";

  // Test 1: Password that is too short
  await TestValidator.error("password too short should fail", async () => {
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "123", // Too short password
        first_name: validFirstName,
        last_name: validLastName,
        href: validHref,
        referrer: validReferrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  });

  // Test 2: Common weak password
  await TestValidator.error("common weak password should fail", async () => {
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password", // Common weak password
        first_name: validFirstName,
        last_name: validLastName,
        href: validHref,
        referrer: validReferrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  });

  // Test 3: Sequential numbers password
  await TestValidator.error(
    "sequential numbers password should fail",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "12345678", // Sequential numbers
          first_name: validFirstName,
          last_name: validLastName,
          href: validHref,
          referrer: validReferrer,
        } satisfies IShoppingMallCustomer.ICreate,
      });
    },
  );

  // Test 4: All lowercase letters without complexity
  await TestValidator.error(
    "password without complexity should fail",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "abcdefgh", // Only lowercase letters
          first_name: validFirstName,
          last_name: validLastName,
          href: validHref,
          referrer: validReferrer,
        } satisfies IShoppingMallCustomer.ICreate,
      });
    },
  );

  // Test 5: Empty string password
  await TestValidator.error("empty password should fail", async () => {
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "", // Empty password
        first_name: validFirstName,
        last_name: validLastName,
        href: validHref,
        referrer: validReferrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  });

  // Test 6: Password with only spaces
  await TestValidator.error(
    "password with only spaces should fail",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "        ", // Only spaces
          first_name: validFirstName,
          last_name: validLastName,
          href: validHref,
          referrer: validReferrer,
        } satisfies IShoppingMallCustomer.ICreate,
      });
    },
  );

  // Test 7: Password with common patterns
  await TestValidator.error(
    "password with common patterns should fail",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "qwertyuiop", // Keyboard pattern
          first_name: validFirstName,
          last_name: validLastName,
          href: validHref,
          referrer: validReferrer,
        } satisfies IShoppingMallCustomer.ICreate,
      });
    },
  );

  // Final validation: Ensure valid password works
  const finalEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "SecurePassword123!";
  const validCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: finalEmail,
      password: validPassword,
      first_name: validFirstName,
      last_name: validLastName,
      href: validHref,
      referrer: validReferrer,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(validCustomer);
  TestValidator.equals(
    "valid registration returns correct email",
    validCustomer.email,
    finalEmail,
  );
  TestValidator.equals(
    "valid registration returns correct first name",
    validCustomer.first_name,
    validFirstName,
  );
  TestValidator.equals(
    "valid registration returns correct last name",
    validCustomer.last_name,
    validLastName,
  );
  TestValidator.predicate(
    "valid registration returns non-empty token",
    validCustomer.token.access.length > 0,
  );
}
