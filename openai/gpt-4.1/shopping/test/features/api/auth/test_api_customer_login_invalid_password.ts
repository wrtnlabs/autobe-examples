import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test invalid password during customer login authentication.
 *
 * This scenario registers a new customer and then attempts login with the
 * correct email and an incorrect password to ensure authentication does not
 * succeed. The test validates secure password checking and appropriate error
 * error handling. Steps:
 *
 * 1. Register a new random customer to obtain a valid email and correct password.
 * 2. Attempt to login with the correct email but an invalid password, keeping same
 *    format constraints.
 * 3. Verify that login fails and the API raises an error, matching business and
 *    security expectations.
 */
export async function test_api_customer_login_invalid_password(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const registrationInput = {
    email: customerEmail,
    password: customerPassword satisfies string,
    name: customerName,
    phone: customerPhone,
  } satisfies IShoppingMallCustomer.ICreate;

  const registered = await api.functional.auth.customer.join(connection, {
    body: registrationInput,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registered email matches",
    registered.email,
    customerEmail,
  );

  // 2. Attempt login with correct email but wrong password
  const wrongPassword = customerPassword + "wrong";
  const loginInput = {
    email: customerEmail,
    password: wrongPassword,
    href: "https://mall.example.com/login",
    referrer: "https://mall.example.com/welcome",
  } satisfies IShoppingMallCustomer.ILogin;

  // 3. Validates authentication fails and returns an error
  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: loginInput,
      });
    },
  );
}
