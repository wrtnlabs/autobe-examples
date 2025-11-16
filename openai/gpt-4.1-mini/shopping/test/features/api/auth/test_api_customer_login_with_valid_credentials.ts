import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new customer using join
  // 2. Login with the registered customer's credentials
  // 3. Assert the returned authorized customer data and token

  // Using realistic random values for email, full_name, href, referrer, and IP where applicable
  // Ensuring all required properties are present and correct types

  // Step 1: Join customer
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = "SuperSecret123!";
  const full_name: string = RandomGenerator.name();
  const href: string = "https://example.com/signup";
  const referrer: string = "https://example.com/home";
  const ip: string | null = Math.random() > 0.5 ? typia.random<string>() : null; // Optional IP

  const joinBody = {
    email,
    password,
    full_name,
    href,
    referrer,
    ip,
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(authorizedCustomer);

  // Step 2: Login customer
  const loginBody = {
    email,
    password,
    href: "https://example.com/login",
    referrer: "https://example.com/signup",
    ip,
  } satisfies IShoppingMallCustomer.ILogin;
  const loginAuthorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, { body: loginBody });
  typia.assert(loginAuthorizedCustomer);

  // Step 3: Basic assertions
  TestValidator.equals(
    "login email should match registered email",
    loginAuthorizedCustomer.email,
    email,
  );
  TestValidator.equals(
    "login full_name should match registered full_name",
    loginAuthorizedCustomer.name,
    full_name,
  );
  TestValidator.predicate(
    "login token access should be a non-empty string",
    typeof loginAuthorizedCustomer.token.access === "string" &&
      loginAuthorizedCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token refresh should be a non-empty string",
    typeof loginAuthorizedCustomer.token.refresh === "string" &&
      loginAuthorizedCustomer.token.refresh.length > 0,
  );
  // Dates for token expiry
  TestValidator.predicate(
    "token expired_at is valid ISO 8601",
    typeof loginAuthorizedCustomer.token.expired_at === "string" &&
      loginAuthorizedCustomer.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO 8601",
    typeof loginAuthorizedCustomer.token.refreshable_until === "string" &&
      loginAuthorizedCustomer.token.refreshable_until.length > 0,
  );
}
