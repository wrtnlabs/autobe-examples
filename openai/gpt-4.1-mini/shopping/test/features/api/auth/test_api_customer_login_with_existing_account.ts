import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_login_with_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account using join operation
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "password123";
  const fullName = RandomGenerator.name();
  const href = "https://example.com/signup";
  const referrer = "https://example.com/landing";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: email,
        password: password,
        full_name: fullName,
        href: href,
        referrer: referrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Login with the registered email and password
  const login: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: email,
        password: password,
        href: href,
        referrer: referrer,
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(login);

  // Step 3: Verify that login JWT tokens are issued
  TestValidator.predicate(
    "access token is non-empty string",
    typeof login.token.access === "string" && login.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof login.token.refresh === "string" && login.token.refresh.length > 0,
  );

  // Step 4: Verify that the logged in user email matches created user email
  TestValidator.equals("login email matches created email", login.email, email);
}
