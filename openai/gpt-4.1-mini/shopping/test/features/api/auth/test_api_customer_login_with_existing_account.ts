import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_login_with_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account using /auth/customer/join
  // Generate random email adhering to email format
  const joinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // Use a fixed test password string matching password format
  const joinPassword = "TestPassw0rd!";

  const joinedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(joinedCustomer);

  // Step 2: Attempt login with valid credentials
  const loginBody: IShoppingMallCustomer.ILogin = {
    email: joinEmail,
    password: joinPassword,
    __typename: "ILogin",
  };

  const loginResponse: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Step 3: Validate the login response matches the joined customer
  TestValidator.equals(
    "login response id matches joined customer",
    loginResponse.id,
    joinedCustomer.id,
  );
  TestValidator.equals(
    "login response email matches joined customer",
    loginResponse.email,
    joinedCustomer.email,
  );

  // Validate tokens exist and are strings
  TestValidator.predicate(
    "login response contains access token",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response contains refresh token",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );

  // Step 4: Test failure case with invalid email
  await TestValidator.error("login fails with invalid email", async () => {
    await api.functional.auth.customer.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(), // random email unlikely to exist
        password: joinPassword,
        __typename: "ILogin",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });

  // Step 5: Test failure case with invalid password
  await TestValidator.error("login fails with invalid password", async () => {
    await api.functional.auth.customer.login(connection, {
      body: {
        email: joinEmail,
        password: "WrongPassword123!",
        __typename: "ILogin",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
}
