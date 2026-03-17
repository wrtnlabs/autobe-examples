import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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

export async function test_api_customer_address_delete_ownership_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Customer A and obtain authenticated connection
  const connectionA: api.IConnection = { host: connection.host };
  await authorize_customer_join(connectionA, {});
  // Step 2: Create a shipping address under Customer A's account
  const customerAAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      connectionA,
      {},
    );
  typia.assert(customerAAddress);
  // Step 3: Register Customer B and obtain authenticated connection
  const connectionB: api.IConnection = { host: connection.host };
  await authorize_customer_join(connectionB, {});
  // Step 4: Attempt to delete Customer A's address using Customer B's session
  // This must fail with an authorization error (403 Forbidden or equivalent)
  await TestValidator.error(
    "Customer B cannot delete Customer A's address",
    async () => {
      await api.functional.shoppingMall.customer.addresses.erase(connectionB, {
        addressId: customerAAddress.id,
      });
    },
  );
}
