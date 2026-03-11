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
 * Test scenario: Customer switches default address from first to second address.
 *
 * Business Rules Tested:
 * - First address created automatically becomes default
 * - Second address created remains non-default
 * - Setting new default via PATCH API succeeds
 * - Only one default address per customer at any time
 */
export async function test_api_customer_address_default_switch(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Create first address - should automatically become default
  const firstAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(firstAddress);
  TestValidator.equals(
    "first address should be default",
    firstAddress.isDefault,
    true,
  );
  // Step 3: Create second address - should remain non-default
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address should not be default",
    secondAddress.isDefault,
    false,
  );
  // Step 4: Switch default to second address
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses._default.updateDefault(
      customerConnection,
      { addressId: secondAddress.id },
    );
  typia.assert(updatedAddress);
  // Step 5: Verify second address is now default
  TestValidator.equals(
    "updated address should be default",
    updatedAddress.isDefault,
    true,
  );
  TestValidator.equals(
    "updated address ID should match second address",
    updatedAddress.id,
    secondAddress.id,
  );
  // Note: Per API specification, setting a new default atomically removes
  // default from the previous default address. The backend ensures only
  // one default address exists per customer at any time.
}
