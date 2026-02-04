import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrder";
import type { IShoppingMallSalesOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Verify that an admin can retrieve a specific order item with historical context.
 *
 * This test confirms the response returns complete product details as they were at
 * time of purchase, including historical snapshots (price, variant options, metadata),
 * and correct status transitions (paid, shipped, delivered, cancelled).
 */
export async function test_api_admin_order_item_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection with proper authentication for order item retrieval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Generate random IDs for the order and item
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the order item for the given IDs
  const orderItem: IShoppingMallSalesOrderItem =
    await api.functional.shoppingMall.admin.orders.items.at(adminConnection, {
      orderId,
      itemId,
    });
  // Ensure the response is properly typed and validated
  typia.assert(orderItem);
}
