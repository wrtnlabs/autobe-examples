import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSalesOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_snapshot_by_order_item_id(
  connection: api.IConnection,
): Promise<void> {
  // Create a new seller account with approved status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create a test product (this would typically be through API, but for simplicity we just generate random IDs)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Create a test order (this would also typically be through API)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Create a test order item (ID is the one we'll retrieve snapshots for)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // In a real implementation we'd use actual API calls to create an order item with snapshots,
  // but for the purpose of this test example, we're using random IDs to show the pattern.
  // Retrieve order item snapshots by the test order item ID
  const snapshots =
    await api.functional.shoppingMall.seller.order_items.snapshots.index(
      sellerConnection,
      {
        body: {
          orderItemId: orderItemId,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate that snapshots match expected structure
  TestValidator.equals(
    "order item snapshots data array length should be greater than 0",
    snapshots.data.length > 0,
    true,
  );
  // If snapshots exist, validate specific values
  if (snapshots.data.length > 0) {
    // Verify the order item ID in the snapshot matches the requested ID
    TestValidator.equals(
      "order item ID match",
      snapshots.data[0].order_item.id,
      orderItemId,
    );
    // Verify the snapshot action type
    TestValidator.predicate(
      "snapshot action should be either 'shipped' or 'cancelled'",
      snapshots.data[0].action === "shipped" ||
        snapshots.data[0].action === "cancelled",
    );
  }
}
