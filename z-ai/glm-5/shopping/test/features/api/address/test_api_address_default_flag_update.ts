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
 * Test default address flag update workflow.
 *
 * Tests the business logic for default address management:
 * - When a customer has multiple addresses and sets one as default,
 *   the system automatically unsets the previous default address.
 *
 * Test flow:
 * 1. Customer joins the system
 * 2. Customer creates first address (becomes default automatically)
 * 3. Customer creates second address (not default)
 * 4. Customer updates second address setting is_default=true
 * 5. Verify the second address's is_default is now true
 */
export async function test_api_address_default_flag_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create first address (becomes default automatically)
  const firstAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(firstAddress);
  // Verify first address is default (business rule: first address becomes default)
  TestValidator.equals(
    "first address is default",
    firstAddress.isDefault,
    true,
  );
  // 3. Create second address (not default)
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(secondAddress);
  // Verify second address is not default (first is already default)
  TestValidator.equals(
    "second address is not default",
    secondAddress.isDefault,
    false,
  );
  // 4. Update second address to be default
  const updatedSecondAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: { is_default: true } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(updatedSecondAddress);
  // 5. Verify second address is now default
  TestValidator.equals(
    "updated second address is default",
    updatedSecondAddress.isDefault,
    true,
  );
}
