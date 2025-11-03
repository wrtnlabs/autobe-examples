import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Verify failed login for customer when password is invalid.
 *
 * 1. Register a new customer with random valid credentials
 * 2. Attempt to login using the same email but with an incorrect password
 * 3. Assert that an authentication error is thrown (login fails)
 * 4. Confirm that no JWT token is issued in response
 */
export async function test_api_customer_login_invalid_password(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const validEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const validPassword: string & tags.MinLength<8> & tags.MaxLength<128> =
    typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: validEmail,
      password: validPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://www.example.com/register",
      referrer: "https://www.example.com/landing",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Attempt to login using the same email but with an incorrect password
  const invalidPassword = validPassword + "!wrong"; // ensure difference
  await TestValidator.error("login fails with invalid password", async () => {
    await api.functional.auth.customer.login(connection, {
      body: {
        email: validEmail,
        password: invalidPassword,
        href: "https://www.example.com/login",
        referrer: "https://www.example.com/landing",
      } satisfies IShoppingCustomer.ILogin,
    });
  });
}
