import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrder";
import type { IShoppingMallSalesOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_orders_create } from "../../../generate/generate_random_shopping_mall_admin_orders_create";
import { generate_random_shopping_mall_admin_orders_items_create } from "../../../generate/generate_random_shopping_mall_admin_orders_items_create";
import { prepare_random_shopping_mall_sales_order } from "../../../prepare/prepare_random_shopping_mall_sales_order";
import { prepare_random_shopping_mall_sales_order_item } from "../../../prepare/prepare_random_shopping_mall_sales_order_item";

export async function test_api_order_item_quantity_update_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin authentication context
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Create test order
  const order = await generate_random_shopping_mall_admin_orders_create(
    adminConnection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  // 3. Add item to test order
  const orderItem =
    await generate_random_shopping_mall_admin_orders_items_create(
      adminConnection,
      {
        body: {},
        params: {
          orderId: order.id,
        },
      },
    );
  // 4. Update item quantity to 1 (minimum allowed value)
  const updatedOrderItem =
    await api.functional.shoppingMall.admin.orders.items.update(
      adminConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          quantity: 1,
        } satisfies IShoppingMallSalesOrderItem.IUpdate,
      },
    );
  // 5. Verify quantity was updated to 1
  TestValidator.equals(
    "order item quantity updated to minimum value",
    updatedOrderItem.quantity,
    1,
  );
}
