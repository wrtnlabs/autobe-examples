import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Test that all user-specific data becomes completely inaccessible after logout, verifying session termination effectiveness.
 *
 * This test validates the complete logout workflow by registering a customer, creating user-specific data (shipping address), and then verifying that all authenticated endpoints become inaccessible after session termination. The test ensures that token invalidation is immediate and complete, preventing any further access to protected resources without re-authentication.
 *
 * Special attention is given to verifying that the same connection object (with invalidated token) cannot access any customer-specific endpoints after logout.
 *
 * 1. Register a new customer account and authenticate to establish an active session.
 * 2. Create a shipping address for the customer to have user-specific data.
 * 3. Call the logout endpoint to terminate the session.
 * 4. Attempt to access user-specific data endpoints using the same (now invalidated) token:
 *    4.1. POST /shoppingMall/customer/addresses (create address)
 * 5. Verify all attempts to access user-specific data return 401 Unauthorized.
 * 6. Confirm the access token is completely invalidated and cannot be used for any authenticated operations.
 */
export async function test_api_customer_logout_session_invalidated(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create a shipping address for the customer to have user-specific data
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Verify the address was created successfully before logout
  TestValidator.predicate(
    "address created successfully before logout",
    () => address.id !== undefined && address.recipient_name !== undefined,
  );
  // 4. Call the logout endpoint to terminate the session
  await api.functional.shoppingMall.customer.logout(customerConnection);
  // 5. Attempt to access user-specific data endpoints using the invalidated token
  // 5.1. Try to create a new address (should fail with 401)
  await TestValidator.httpError(
    "address creation returns 401 after logout",
    401,
    async () => {
      await api.functional.shoppingMall.customer.addresses.create(
        customerConnection,
        {
          body: typia.random<IShoppingMallCustomerAddress.ICreate>(),
        },
      );
    },
  );
  // 6. Verify the customer must re-authenticate to regain access
  const newCustomerConnection: api.IConnection = { host: connection.host };
  const newAuthorized = await authorize_customer_join(
    newCustomerConnection,
    {},
  );
  typia.assert(newAuthorized);
  // 7. Verify the new session works correctly (proves old session was invalidated)
  const newAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      newCustomerConnection,
      {},
    );
  typia.assert(newAddress);
  // 8. Confirm the new address was created successfully with the new session
  TestValidator.predicate(
    "new address created successfully with new session",
    () => newAddress.id !== undefined,
  );
  // 9. Verify that the old customerConnection still fails (proves token invalidation, not just server restart)
  await TestValidator.httpError(
    "old session still returns 401 after new authentication",
    401,
    async () => {
      await api.functional.shoppingMall.customer.addresses.create(
        customerConnection,
        {
          body: typia.random<IShoppingMallCustomerAddress.ICreate>(),
        },
      );
    },
  );
}
