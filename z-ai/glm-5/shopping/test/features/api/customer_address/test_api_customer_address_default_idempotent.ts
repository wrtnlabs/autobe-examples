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
 * Test idempotent behavior when setting an already-default address as default.
 *
 * This test verifies that calling the default address endpoint with an address
 * that is already the default succeeds without errors or side effects.
 */
export async function test_api_customer_address_default_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first address - automatically becomes default
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // Verify the first address is automatically set as default
  TestValidator.equals("first address is default", address.isDefault, true);
  // 3. Call default endpoint with the already-default address (idempotent test)
  const result =
    await api.functional.shoppingMall.customer.addresses._default.updateDefault(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(result);
  // 4. Verify idempotent behavior - no error, remains default
  TestValidator.equals("address remains default", result.isDefault, true);
  TestValidator.equals("address ID unchanged", result.id, address.id);
}
