import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer authentication flow with verified account credentials.
 *
 * This test validates the complete customer login process where a customer with
 * a valid registered account successfully authenticates using correct email and
 * password credentials.
 *
 * Test Flow:
 *
 * 1. Register a new customer account with valid credentials
 * 2. Use the same credentials to perform customer login
 * 3. Verify JWT access and refresh tokens are issued
 * 4. Validate customer profile information matches registration
 * 5. Confirm token structure includes all required fields
 */
export async function test_api_customer_login_with_verified_account(
  connection: api.IConnection,
) {
  // Step 1: Generate random customer registration data
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerName = RandomGenerator.name();

  // Step 2: Create a new customer account through registration
  const registeredCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: customerName,
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(registeredCustomer);

  // Step 3: Attempt to login with the registered credentials
  const loginResponse: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(loginResponse);

  // Step 4: Validate customer profile information matches
  TestValidator.equals(
    "logged in customer email matches registration",
    loginResponse.email,
    customerEmail,
  );
  TestValidator.equals(
    "logged in customer name matches registration",
    loginResponse.name,
    customerName,
  );
  TestValidator.equals(
    "logged in customer id matches registered customer",
    loginResponse.id,
    registeredCustomer.id,
  );

  // Step 5: Verify token information is present (typia.assert already validated structure)
  TestValidator.predicate(
    "access token is issued",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    loginResponse.token.refresh.length > 0,
  );
}
