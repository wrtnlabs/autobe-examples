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
 * Test cross-customer address access prevention.
 *
 * Validates data isolation and privacy rules by ensuring that a customer
 * cannot retrieve another customer's shipping address. The system returns
 * HTTP 404 (not 403) to prevent enumeration attacks.
 */
export async function test_api_customer_address_cross_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Customer A account
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  // Step 2: Create shipping address for Customer A
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerAConnection,
    {},
  );
  typia.assert(address);
  // Step 3: Create Customer B account (different email)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // Step 4: Customer B attempts to retrieve Customer A's address
  // Expected: HTTP 404 (not 403) to prevent enumeration attacks
  await TestValidator.httpError("cross-owner access denied", 404, async () => {
    await api.functional.shoppingMall.customer.addresses.at(
      customerBConnection,
      {
        addressId: address.id,
      },
    );
  });
}
