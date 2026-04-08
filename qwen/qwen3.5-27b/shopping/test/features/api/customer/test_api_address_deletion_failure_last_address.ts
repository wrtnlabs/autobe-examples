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
 * Test that address deletion fails when attempting to delete the customer's last remaining address.
 *
 * Validates the business rule that customers must maintain at least one shipping address in their account. The test creates a customer with exactly one address and verifies that deletion attempts are rejected with an appropriate error.
 *
 * This test ensures data integrity by preventing customers from removing their only shipping destination, which would block future checkout operations.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Create exactly one shipping address for the customer.
 * 3. Attempt to delete the only address.
 * 4. Verify the deletion operation fails with an error.
 */
export async function test_api_address_deletion_failure_last_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create exactly one address for the customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Attempt to delete the only address - should fail
  await TestValidator.error(
    "deletion fails when it is the last address",
    async () => {
      await api.functional.shoppingMall.customer.addresses.erase(
        customerConnection,
        {
          addressId: address.id,
        },
      );
    },
  );
}
