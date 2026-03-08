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

export async function test_api_address_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Customer A joins and authenticates
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  // Customer B joins and authenticates
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // Customer B creates a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerBConnection,
    {},
  );
  typia.assert(address);
  // Customer A attempts to update Customer B's address
  // Should receive 404 Not Found (privacy-preserving error)
  await TestValidator.httpError(
    "Customer A cannot update Customer B's address",
    404,
    async () => {
      await api.functional.shoppingMall.customer.addresses.update(
        customerAConnection,
        {
          addressId: address.id,
          body: {
            recipientName: RandomGenerator.name(),
          } satisfies IShoppingMallAddress.IUpdate,
        },
      );
    },
  );
}
