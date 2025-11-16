import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate that customer login rejects an incorrect password.
 *
 * Business goal
 *
 * - Ensure that the customer authentication flow does NOT succeed when the email
 *   exists but the password is wrong.
 * - Confirm that the happy path join still works and returns a proper
 *   IShoppingMallCustomer.IAuthorized envelope with token and customer
 *   summary.
 * - Rely only on the fact that login fails (throws) for wrong password, without
 *   asserting specific HTTP status codes or error payloads.
 *
 * Scenario
 *
 * 1. Register a customer via POST /auth/customer/join with a known email,
 *    password, and realistic href/referrer/ip context.
 * 2. Attempt to log in via POST /auth/customer/login using the same email but a
 *    clearly different wrong password, while still providing valid
 *    href/referrer/ip/userAgent values.
 * 3. Expect the login call to fail (throw) and assert this using
 *    TestValidator.error, treating any successful response as a test failure.
 * 4. Do not try to inspect HTTP status codes or error messages; only check that an
 *    error occurs.
 * 5. Optionally, assert that the successful join response conforms to
 *    IShoppingMallCustomer.IAuthorized using typia.assert.
 */
export async function test_api_customer_login_rejects_invalid_password(
  connection: api.IConnection,
) {
  // 1. Register a customer with known credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphabets(12);

  const joinBody = {
    email,
    password,
    name: RandomGenerator.name(),
    // ip is optional and nullable
    ip: "203.0.113.10",
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  // 2. Attempt to log in with same email but wrong password
  const wrongPassword: string = `${password}_wrong`;

  const loginBody = {
    email,
    password: wrongPassword,
    ip: "203.0.113.10",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "Mozilla/5.0 (E2E Test Suite)",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  // 3. Assert that login fails for wrong password.
  //    We do not assert specific status codes or error bodies.
  await TestValidator.error("login with wrong password must fail", async () => {
    await api.functional.auth.customer.login(connection, {
      body: loginBody,
    });
  });
}
