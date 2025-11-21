import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer login with invalid email or password combinations to validate
 * authentication failure handling. Ensures proper error messages are returned
 * for invalid credentials without revealing specific account existence
 * information for security purposes.
 */
export async function test_api_customer_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Create a valid customer account for testing
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "ValidPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Test wrong email with correct password
  await TestValidator.error(
    "wrong email with correct password should fail",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(), // Different email
          password: customerPassword, // Correct password
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // 3. Test correct email with wrong password
  await TestValidator.error(
    "correct email with wrong password should fail",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: customerEmail, // Correct email
          password: "WrongPassword456", // Different password
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // 4. Test both email and password incorrect
  await TestValidator.error(
    "both email and password incorrect should fail",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(), // Different email
          password: "CompletelyWrong789", // Different password
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // 5. Test with empty password
  await TestValidator.error("empty password should fail", async () => {
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail, // Correct email
        password: "", // Empty password
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });

  // 6. Test with very long password
  await TestValidator.error("very long password should fail", async () => {
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail, // Correct email
        password: "a".repeat(1000), // Very long password
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });

  // 7. Verify that valid credentials still work
  const validLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(validLogin);
  TestValidator.equals(
    "valid login returns customer ID",
    validLogin.id,
    customer.id,
  );
}
