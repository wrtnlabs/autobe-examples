import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
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

/**
 * Test unauthorized access to order item snapshots.
 * 1. Create two customers with separate connections
 * 2. Each customer creates their own order
 * 3. Customer1 attempts to access Customer2's order item snapshots (should fail)
 * 4. Customer2 can access their own order item snapshots (should succeed)
 */
export async function test_api_order_item_snapshot_history_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer connection
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await api.functional.shoppingMall.auth.customer.join(
    customer1Connection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(customer1);
  // 2. Create second customer connection
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await api.functional.shoppingMall.auth.customer.join(
    customer2Connection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(customer2);
  // 3. Customer1 creates an order
  const order1 = await api.functional.shoppingMall.customer.orders.create(
    customer1Connection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  typia.assert(order1);
  // 4. Customer2 creates an order
  const order2 = await api.functional.shoppingMall.customer.orders.create(
    customer2Connection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  typia.assert(order2);
  // 5. Customer1 attempts to access snapshots for customer2's order item
  // This should fail with 403 Forbidden error
  await TestValidator.error(
    "customer1 cannot access customer2's order item snapshots",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.snapshots.index(
        customer1Connection,
        {
          orderId: "00000000-0000-0000-0000-000000000001",
          itemId: "00000000-0000-0000-0000-000000000002",
        },
      );
    },
  );
  // 6. Verify customer2 CAN access their own order item snapshots
  const snapshots =
    await api.functional.shoppingMall.customer.orders.items.snapshots.index(
      customer2Connection,
      {
        orderId: "00000000-0000-0000-0000-000000000003",
        itemId: "00000000-0000-0000-0000-000000000004",
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "customer2 can access own snapshots",
    snapshots.data !== undefined,
  );
}
