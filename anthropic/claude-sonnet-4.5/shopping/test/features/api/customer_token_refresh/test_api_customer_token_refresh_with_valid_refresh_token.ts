import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the complete token refresh workflow for customer authentication.
 *
 * This test validates the token refresh mechanism by:
 *
 * 1. Creating a new customer account to obtain initial tokens
 * 2. Using the refresh token to obtain a new access token
 * 3. Validating the new token structure and customer information
 * 4. Confirming the refresh mechanism extends sessions without re-authentication
 */
export async function test_api_customer_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account to obtain initial access and refresh tokens
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerName = RandomGenerator.name();

  const initialCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: customerName,
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });

  typia.assert(initialCustomer);

  // Validate initial customer data
  TestValidator.equals(
    "initial customer email matches",
    initialCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "initial customer name matches",
    initialCustomer.name,
    customerName,
  );
  typia.assert<IAuthorizationToken>(initialCustomer.token);

  // Step 2: Use the refresh token to obtain a new access token
  const refreshedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: {
        refresh_token: initialCustomer.token.refresh,
      } satisfies IShoppingMallCustomer.IRefresh,
    });

  typia.assert(refreshedCustomer);

  // Step 3: Validate the refreshed customer data and new token structure
  TestValidator.equals(
    "refreshed customer ID matches",
    refreshedCustomer.id,
    initialCustomer.id,
  );
  TestValidator.equals(
    "refreshed customer email matches",
    refreshedCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "refreshed customer name matches",
    refreshedCustomer.name,
    customerName,
  );

  // Validate new token structure contains all required fields
  typia.assert<IAuthorizationToken>(refreshedCustomer.token);

  // Step 4: Confirm that new access token was generated (different from initial)
  TestValidator.notEquals(
    "new access token differs from initial",
    refreshedCustomer.token.access,
    initialCustomer.token.access,
  );
}
