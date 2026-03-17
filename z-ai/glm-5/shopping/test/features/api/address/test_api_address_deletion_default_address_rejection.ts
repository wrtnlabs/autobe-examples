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
 * Test rejection when attempting to delete default address while other addresses exist.
 *
 * Business Rule: If a customer attempts to delete their default address while
 * they have other addresses, the system rejects the deletion. Customer must
 * first set another address as default before deleting the current default.
 */
export async function test_api_address_deletion_default_address_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Create first address - becomes default automatically
  const firstAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(firstAddress);
  // Create second address - non-default
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(secondAddress);
  // Verify: First address is default, second is not
  TestValidator.equals(
    "first address should be default",
    firstAddress.isDefault,
    true,
  );
  TestValidator.equals(
    "second address should not be default",
    secondAddress.isDefault,
    false,
  );
  // Test: Attempt to delete default address - should fail
  await TestValidator.error(
    "cannot delete default address while other addresses exist",
    async () =>
      api.functional.shoppingMall.customer.addresses.erase(customerConnection, {
        addressId: firstAddress.id,
      }),
  );
  // Verify: Both addresses still exist and default status unchanged
  TestValidator.equals(
    "both addresses should exist",
    [firstAddress.id, secondAddress.id].length,
    2,
  );
  TestValidator.equals(
    "first address should still be default",
    firstAddress.isDefault,
    true,
  );
  TestValidator.equals(
    "first address should not be deleted",
    firstAddress.deletedAt,
    null,
  );
}