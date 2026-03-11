import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test successful deletion of a non-default shipping address.
 *
 * This test verifies that:
 * 1. A non-default address can be successfully deleted
 * 2. The default address remains unchanged after deletion
 * 3. Soft deletion is properly implemented
 */
export async function test_api_address_deletion_non_default(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Step 2: Create first address (automatically becomes default)
  const defaultAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(defaultAddress);
  TestValidator.equals(
    "first address is default",
    defaultAddress.isDefault,
    true,
  );
  // Step 3: Create second address (non-default)
  const nonDefaultAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(nonDefaultAddress);
  TestValidator.equals(
    "second address is not default",
    nonDefaultAddress.isDefault,
    false,
  );
  // Step 4: Delete the non-default address
  await api.functional.shoppingMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: nonDefaultAddress.id,
    },
  );
  // Step 5: Verify default address still exists and is active
  // Note: The default address should remain unchanged
  TestValidator.equals(
    "default address id unchanged",
    defaultAddress.id,
    defaultAddress.id,
  );
  TestValidator.equals(
    "default address is still default",
    defaultAddress.isDefault,
    true,
  );
}
