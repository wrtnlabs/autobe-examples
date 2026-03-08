import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";

export async function test_api_order_detail_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First customer authenticates and creates an order
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {});
  // Step 2: First customer creates a shipping address for checkout
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customer1Connection,
    {},
  );
  typia.assert(address);
  // Step 3: First customer creates an order through checkout
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customer1Connection,
    {
      body: {
        address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Step 4: Second customer authenticates via join
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  // Step 5: Second customer attempts to retrieve first customer's order
  // Step 6: Verify system returns 403 Forbidden
  await TestValidator.httpError(
    "access denied - customer cannot view another customer's order",
    403,
    async () => {
      await api.functional.shoppingMall.customer.orders.at(
        customer2Connection,
        {
          orderId: order.id,
        },
      );
    },
  );
}
