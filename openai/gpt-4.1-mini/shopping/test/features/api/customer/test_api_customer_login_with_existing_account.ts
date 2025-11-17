import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_login_with_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account (join)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    email: email,
    password: password,
    href: "https://example.com/auth/join",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ICreate;

  const createdCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(createdCustomer);
  TestValidator.equals(
    "join: email matches input",
    createdCustomer.email,
    email,
  );

  // Step 2: Login with the created customer's credentials
  const loginBody = {
    email: email,
    password: password,
    href: "https://example.com/auth/login",
    referrer: "https://example.com/",
    ip: null,
  } satisfies IShoppingMallCustomer.ILogin;

  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, { body: loginBody });
  typia.assert(loggedInCustomer);

  // Step 3: Validate that login email matches and token is present
  TestValidator.equals(
    "login: email equals join email",
    loggedInCustomer.email,
    email,
  );
  TestValidator.predicate(
    "login: token contains access string",
    typeof loggedInCustomer.token.access === "string" &&
      loggedInCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: token contains refresh string",
    typeof loggedInCustomer.token.refresh === "string" &&
      loggedInCustomer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login: token expired_at is valid ISO date",
    !isNaN(Date.parse(loggedInCustomer.token.expired_at)),
  );
  TestValidator.predicate(
    "login: token refreshable_until is valid ISO date",
    !isNaN(Date.parse(loggedInCustomer.token.refreshable_until)),
  );
  // Step 4: Validate minimum required fields for authorized customer
  TestValidator.predicate(
    "login: user has id",
    typeof loggedInCustomer.id === "string" && loggedInCustomer.id.length > 0,
  );
}
