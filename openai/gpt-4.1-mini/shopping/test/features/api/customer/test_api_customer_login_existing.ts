import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_login_existing(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account to establish a fresh user context
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: createBody });
  typia.assert(customer);

  // Step 2: Attempt to login using the registered email and password
  const loginBody = {
    email: customer.email,
    password: "ValidPassword123!",
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ILogin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, { body: loginBody });
  typia.assert(authorized);

  // Step 3: Validate that tokens and session info are returned properly
  TestValidator.predicate(
    "login returns token.access",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns token.refresh",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.equals("login email matches", authorized.email, customer.email);
  TestValidator.equals(
    "login nickname matches",
    authorized.nickname,
    customer.nickname,
  );
}
