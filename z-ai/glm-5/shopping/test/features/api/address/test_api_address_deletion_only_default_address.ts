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
 * Test deletion of the only/default address when no other addresses exist.
 *
 * Business Rule: If a customer deletes their default address and it is their
 * only address, the system allows deletion and leaves the customer without
 * a default address.
 *
 * Flow:
 * 1. Customer registers
 * 2. Customer creates their first (and only) address - automatically becomes default
 * 3. Delete the only default address - should succeed
 * 4. Verify deletion by attempting to delete again (should fail with 404)
 */
export async function test_api_address_deletion_only_default_address(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer-specific connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Create the first (and only) address
  // First address automatically becomes default (is_default=true)
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // Verify first address is automatically set as default
  TestValidator.equals("first address is default", address.isDefault, true);
  TestValidator.equals("address has no deleted_at", address.deletedAt, null);
  // Step 3: Delete the only/default address
  // Business rule: deletion should succeed for the only address
  await api.functional.shoppingMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address.id,
    },
  );
  // Step 4: Verify deletion by attempting to delete again
  // A second deletion attempt should fail (404 Not Found)
  // because the address has been soft-deleted
  await TestValidator.httpError(
    "cannot delete already deleted address",
    404,
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
