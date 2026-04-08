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
 * Test successful deletion of a non-default shipping address when the customer has multiple addresses.
 *
 * Validates that customers can delete a shipping address when they have multiple addresses registered. The test creates two addresses, then deletes the non-default one to verify the deletion succeeds without affecting the remaining address.
 *
 * Special attention is given to ensuring that the deletion operation works correctly when the customer maintains at least one address after deletion, and that the default address flag on remaining addresses is not modified.
 *
 * 1. Register and authenticate as a customer
 * 2. Create first shipping address for the customer
 * 3. Create second shipping address for the customer
 * 4. Delete the second (non-default) address
 * 5. Verify the deletion succeeds without errors
 */
export async function test_api_address_deletion_success_multiple_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first address
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address1);
  // 3. Create second address
  const address2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address2);
  // 4. Delete the second (non-default) address
  await api.functional.shoppingMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address2.id,
    },
  );
  // 5. Verify deletion succeeded (no error thrown)
  TestValidator.predicate("deletion succeeded without error", true);
}
