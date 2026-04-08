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
 * Test that retrieving a soft-deleted customer address returns 404 Not Found.
 *
 * Validates that when a customer deletes their shipping address (soft delete with deleted_at timestamp), subsequent retrieval attempts using the address ID return a 404 Not Found error. This ensures that soft-deleted addresses are properly excluded from active address queries while preserving them in the database for historical order records.
 *
 * The test verifies the soft delete pattern implementation where deleted addresses remain in the database but are hidden from all customer-facing retrieval endpoints.
 *
 * 1. Register and authenticate a customer account
 * 2. Create a shipping address for the authenticated customer
 * 3. Delete the address using the erase endpoint (soft delete)
 * 4. Attempt to retrieve the deleted address using the at endpoint
 * 5. Validate that a 404 Not Found HTTP error is thrown
 */
export async function test_api_address_retrieve_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Delete the address (soft delete)
  await api.functional.shoppingMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address.id,
    },
  );
  // 4. Attempt to retrieve the deleted address - should throw 404
  await TestValidator.httpError(
    "deleted address returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.customer.addresses.at(
        customerConnection,
        {
          addressId: address.id,
        },
      ),
  );
}
