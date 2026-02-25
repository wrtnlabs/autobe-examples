import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_customer_orders_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Customer 1 setup - register and create an order
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: "customer1-isolation@test.com",
      password: "Password123!",
    },
  });
  typia.assert(customer1);
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customer1Connection,
    {},
  );
  typia.assert(order1);
  // Customer 2 setup - register and create an order
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: "customer2-isolation@test.com",
      password: "Password123!",
    },
  });
  typia.assert(customer2);
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customer2Connection,
    {},
  );
  typia.assert(order2);
  // Customer 2 retrieves their order list
  const orderList = await api.functional.shoppingMall.customer.orders.index(
    customer2Connection,
    {
      body: {} satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderList);
  // Validate data isolation - only customer 2's order should appear
  TestValidator.equals("pagination records", orderList.pagination.records, 1);
  TestValidator.equals("data length", orderList.data.length, 1);
  TestValidator.equals(
    "order belongs to customer 2",
    orderList.data[0].id,
    order2.id,
  );
  // Verify customer 1's order is NOT present
  const order1Exists = orderList.data.some((order) => order.id === order1.id);
  TestValidator.predicate(
    "customer 1 order not visible to customer 2",
    !order1Exists,
  );
}
