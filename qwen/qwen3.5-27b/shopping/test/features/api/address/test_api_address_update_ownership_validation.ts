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
 * Test that only the address owner can update it - verify authorization enforcement.
 *
 * Validates that the address update endpoint enforces proper authorization by rejecting attempts from customers who do not own the address. This ensures data isolation and security in the multi-tenant customer address system.
 *
 * The test creates two separate customer accounts, with the first customer creating an address, then attempts to update that address using the second customer's authentication context. The system should reject this unauthorized access attempt.
 *
 * 1. Register and authenticate as customer A (first customer).
 * 2. Create a shipping address as customer A.
 * 3. Register and authenticate as customer B (second customer).
 * 4. As customer B, attempt to update customer A's address with valid update data.
 * 5. Verify the request is rejected with an authorization error (403 Forbidden or 404 Not Found).
 */
export async function test_api_address_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  // 2. Create a shipping address as customer A
  const address: IShoppingMallCustomerAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(address);
  // 3. Register and authenticate as customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // 4. As customer B, attempt to update customer A's address
  const updateBody = {
    phone_number: "999-9999-9999",
  } satisfies IShoppingMallCustomerAddress.IUpdate;
  // 5. Verify the request is rejected with an authorization error
  await TestValidator.error(
    "unauthorized address update rejected",
    async () => {
      await api.functional.shoppingMall.customer.customers.me.addresses.update(
        customerBConnection,
        {
          addressId: address.id,
          body: updateBody,
        },
      );
    },
  );
}
