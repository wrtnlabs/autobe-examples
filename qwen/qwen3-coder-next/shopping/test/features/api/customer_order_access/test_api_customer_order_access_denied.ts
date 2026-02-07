import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_customer_order_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer A and get their authorization token
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAToken = await authorize_customer_join(customerAConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 2. Create customer B (different customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 3. Create a random order ID for customer A's order
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 4. Customer B attempts to access customer A's order - should be denied
  await TestValidator.error(
    "customer B cannot access customer A's order",
    async () => {
      await api.functional.shoppingMall.customer.orders.at(
        customerBConnection,
        {
          orderId: orderId,
        },
      );
    },
  );
}
