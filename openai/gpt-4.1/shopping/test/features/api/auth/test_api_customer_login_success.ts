import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validates successful login for a registered customer using correct email,
 * password, connection URL, and referrer. Ensures authentication endpoint
 * returns expected JWT tokens and identity fields.
 *
 * 1. Register a new customer with randomized credentials via the join API
 * 2. Attempt login using the exact credentials (email, password) and valid
 *    href/referrer URLs
 * 3. Validate that the login returns an authorized customer object
 * 4. Assert that response fields match expected values (identity, session data,
 *    and token structure)
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.Format<"password"> =
    typia.random<string & tags.MinLength<8> & tags.Format<"password">>();
  const name: string & tags.MinLength<2> & tags.MaxLength<64> = typia.random<
    string & tags.MinLength<2> & tags.MaxLength<64>
  >();
  const phone: string & tags.Pattern<"^[0-9\\-+() ]{8,20}$"> = typia.random<
    string & tags.Pattern<"^[0-9\\-+() ]{8,20}$">
  >();

  const registerBody = {
    email,
    password,
    name,
    phone,
  } satisfies IShoppingMallCustomer.ICreate;
  const registered: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: registerBody,
    });
  typia.assert(registered);
  TestValidator.equals(
    "registration email matches input",
    registered.email,
    email,
  );
  TestValidator.equals(
    "registration name matches input",
    registered.name,
    name,
  );
  TestValidator.equals(
    "registration phone matches input",
    registered.phone,
    phone,
  );

  // 2. Attempt customer login with correct credentials and URLs
  const href: string & tags.Format<"uri"> = "https://shop.e2e-test.com/login";
  const referrer: string & tags.Format<"uri"> = "https://shop.e2e-test.com/";
  const loginBody = {
    email,
    password,
    href,
    referrer,
  } satisfies IShoppingMallCustomer.ILogin;
  const loggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Validate that returned identity fields match those from registration (except for token and timestamp fields)
  TestValidator.equals(
    "login customer id matches registration",
    loggedIn.id,
    registered.id,
  );
  TestValidator.equals("login email matches input", loggedIn.email, email);
  TestValidator.equals("login name matches input", loggedIn.name, name);
  TestValidator.equals("login phone matches input", loggedIn.phone, phone);
  TestValidator.predicate(
    "login returns a JWT token structure",
    typeof loggedIn.token === "object" &&
      typeof loggedIn.token.access === "string" &&
      typeof loggedIn.token.refresh === "string",
  );
}
