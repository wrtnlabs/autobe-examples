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
 * Test that deletion fails when attempting to delete the default address when it's the only address available.
 *
 * Validates the business rule that prevents customers from deleting their default address without first designating another address as the default. This ensures customers always have at least one valid shipping address available for checkout.
 *
 * The test creates a customer account with exactly one address, which becomes the default by default. When attempting to delete this address, the system should reject the operation with an appropriate error, preserving the address in the system.
 *
 * 1. Register and authenticate as a customer with randomized credentials.
 * 2. Create exactly one shipping address for the customer (automatically becomes default).
 * 3. Attempt to delete the default address using the erase endpoint.
 * 4. Verify the deletion fails with an error indicating the default address cannot be deleted.
 * 5. The address remains active and unchanged in the system.
 */
export async function test_api_address_deletion_failure_default_address_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create exactly one address (becomes default)
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // Verify the created address is the default
  TestValidator.predicate(
    "created address is default",
    address.is_default === true,
  );
  // 3. Attempt to delete the default address (should fail)
  await TestValidator.error(
    "cannot delete default address when it's the only one",
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
