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
 * Test that a customer's first shipping address is automatically set as the default.
 *
 * Validates the business rule that when a customer creates their first address,
 * the system automatically designates it as the default shipping address.
 */
export async function test_api_address_first_address_default(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer-specific connection for isolation
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as a new customer
  await authorize_customer_join(customerConnection, {});
  // Step 3: Create the first shipping address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        stateProvince: RandomGenerator.name(1),
        postalCode: RandomGenerator.alphabets(6),
        country: RandomGenerator.name(1),
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  // Step 4: Validate complete response structure
  typia.assert(address);
  // Step 5: Verify first address is automatically set as default
  TestValidator.equals(
    "first address should be default",
    address.isDefault,
    true,
  );
}
