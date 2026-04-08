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
 * Test the authorization rule that prevents customers from retrieving addresses owned by other customers.
 *
 * Validates that the address retrieval endpoint enforces proper authorization by blocking cross-customer access attempts. This test ensures data isolation between customer accounts by verifying that one customer cannot access another customer's address data.
 *
 * The test creates two separate customer accounts, creates an address under Customer A's account, then attempts to retrieve that address while authenticated as Customer B. The system should reject this unauthorized access attempt with a 403 Forbidden error.
 *
 * 1. Register and authenticate Customer A with unique credentials.
 * 2. Create a shipping address for Customer A and capture the address ID.
 * 3. Register and authenticate Customer B with different credentials.
 * 4. Attempt to retrieve Customer A's address while authenticated as Customer B.
 * 5. Verify the request fails with HTTP 403 Forbidden status code.
 */
export async function test_api_address_retrieve_cross_customer_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // 2. Create a shipping address for Customer A
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerAConnection,
    {},
  );
  typia.assert(address);
  // 3. Register and authenticate Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // 4. Verify Customer A and Customer B are different accounts
  TestValidator.notEquals(
    "customers are different",
    customerA.id,
    customerB.id,
  );
  // 5. Attempt to retrieve Customer A's address as Customer B (should fail with 403)
  await TestValidator.httpError(
    "cross-customer address access forbidden",
    403,
    async () =>
      await api.functional.shoppingMall.customer.addresses.at(
        customerBConnection,
        {
          addressId: address.id,
        },
      ),
  );
}
