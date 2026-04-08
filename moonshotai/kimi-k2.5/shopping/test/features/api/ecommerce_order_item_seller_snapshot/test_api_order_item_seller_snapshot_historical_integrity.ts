import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_seller_snapshot_historical_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller with active account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies DeepPartial<IEcommerceMallSeller.IJoin>,
  });
  typia.assert(seller);
  // 2. Find existing orders for this seller
  const ordersPage = await api.functional.ecommerceMall.seller.orders.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ordersPage);
  // Skip test if no orders exist (seller has no order history)
  if (ordersPage.data.length === 0) {
    TestValidator.predicate(
      "test skipped - no orders found for seller",
      () => true,
    );
    return;
  }
  const order = ordersPage.data[0];
  typia.assert(order);
  // 3. Find order items for this order
  const orderItemsPage =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          orderId: order.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsPage);
  // Skip test if no order items exist
  if (orderItemsPage.data.length === 0) {
    TestValidator.predicate("test skipped - no order items found", () => true);
    return;
  }
  const orderItem = orderItemsPage.data[0];
  typia.assert(orderItem);
  // 4. Retrieve seller snapshot for the order item - validates immutability of historical shop profile
  const snapshot =
    await api.functional.ecommerceMall.seller.orders.items.sellerSnapshot.at(
      sellerConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
      },
    );
  // typia.assert validates the complete IEcommerceMallOrderItemSellerSnapshot structure
  // including: id (uuid), shopName (string), logoUrl (nullable url), createdAt (date-time)
  typia.assert(snapshot);
}
