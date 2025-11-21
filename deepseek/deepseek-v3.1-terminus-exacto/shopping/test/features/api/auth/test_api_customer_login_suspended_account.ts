import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer login functionality.
 *
 * IMPORTANT: The original requirement to test suspended account login cannot be
 * implemented with the available API functions, as there is no way to
 * programmatically suspend a customer account. This test validates the normal
 * login flow instead.
 */
export async function test_api_customer_login_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shopping-mall.com/register",
      referrer: "https://shopping-mall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Test successful login with valid credentials
  const loginResult = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shopping-mall.com/login",
      referrer: "https://shopping-mall.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Validate successful login response
  TestValidator.equals(
    "login returns customer ID",
    loginResult.id,
    customer.id,
  );
  TestValidator.equals(
    "login returns correct email",
    loginResult.email,
    customerEmail,
  );
  TestValidator.predicate(
    "login returns valid token",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );

  // Note: Testing suspended account login is not possible with available APIs
  // as there is no administrative function to suspend customer accounts
}
