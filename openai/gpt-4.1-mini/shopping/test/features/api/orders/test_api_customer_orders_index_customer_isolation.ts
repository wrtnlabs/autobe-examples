import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_customer_orders_index_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A joins and is authorized
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: `customerA.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
    },
  });
  // Update connection headers with token
  customerAConnection.headers = {
    Authorization: customerAAuth.token.access,
  };
  // 2. Customer B joins and is authorized
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: `customerB.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
    },
  });
  // Update connection headers with token
  customerBConnection.headers = {
    Authorization: customerBAuth.token.access,
  };
  // 3. Customer A creates some orders
  const orderA1 = await generate_random_shopping_mall_customer_orders_create(
    customerAConnection,
    { body: {} },
  );
  typia.assert(orderA1);
  const orderA2 = await generate_random_shopping_mall_customer_orders_create(
    customerAConnection,
    { body: {} },
  );
  typia.assert(orderA2);
  // 4. Customer B creates some orders
  const orderB1 = await generate_random_shopping_mall_customer_orders_create(
    customerBConnection,
    { body: {} },
  );
  typia.assert(orderB1);
  const orderB2 = await generate_random_shopping_mall_customer_orders_create(
    customerBConnection,
    { body: {} },
  );
  typia.assert(orderB2);
  // 5. Customer A queries their orders via the index endpoint
  const customerAOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerAConnection,
      { body: { page: 1, limit: 100 } satisfies IShoppingMallOrder.IRequest },
    );
  typia.assert(customerAOrders);
  // 6. Validate that all returned orders belong to Customer A only
  for (const order of customerAOrders.data) {
    TestValidator.equals(
      "order belongs to customer A",
      order.customer.id,
      customerAAuth.id,
    );
  }
  // 7. Customer B queries their orders via the index endpoint
  const customerBOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerBConnection,
      { body: { page: 1, limit: 100 } satisfies IShoppingMallOrder.IRequest },
    );
  typia.assert(customerBOrders);
  // 8. Validate that all returned orders belong to Customer B only
  for (const order of customerBOrders.data) {
    TestValidator.equals(
      "order belongs to customer B",
      order.customer.id,
      customerBAuth.id,
    );
  }
  // 9. Validate that Customer A orders are not visible to Customer B and vice versa
  //    by checking no overlap
  const allOrderIdsFromA = new Set(customerAOrders.data.map((o) => o.id));
  const anyOverlap = customerBOrders.data.some((o) =>
    allOrderIdsFromA.has(o.id),
  );
  TestValidator.equals("no order overlap between customers", anyOverlap, false);
}
