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

/**
 * Test retrieving the seller snapshot for an order item that belongs to the authenticated seller.
 * This is the primary success case - the seller should be able to view the profile snapshot
 * they had at the time the order was placed. The snapshot includes shop name, description,
 * logo image URL, and seller reference. This immutability ensures that even if the seller
 * updates their profile later, the original state at order time is preserved for dispute
 * resolution and historical accuracy.
 */
export async function test_api_order_item_seller_snapshot_retrieval_own_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller to gain access
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Retrieve orders to find an orderId containing seller's products
  const ordersResponse = await api.functional.ecommerceMall.seller.orders.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ordersResponse);
  TestValidator.predicate(
    "At least one order should exist",
    ordersResponse.data.length > 0,
  );
  const order = ordersResponse.data[0];
  // 3. Retrieve order items to find a valid orderItemId belonging to the seller
  const orderItemsResponse =
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
  typia.assert(orderItemsResponse);
  TestValidator.predicate(
    "At least one order item should exist for the order",
    orderItemsResponse.data.length > 0,
  );
  const orderItem = orderItemsResponse.data[0];
  // 4. Retrieve the seller snapshot for the order item
  const sellerSnapshot =
    await api.functional.ecommerceMall.seller.orders.items.sellerSnapshot.at(
      sellerConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
      },
    );
  typia.assert(sellerSnapshot);
  // 5. Validate the snapshot content
  TestValidator.predicate(
    "Seller snapshot ID should be valid UUID",
    sellerSnapshot.id.length > 0,
  );
  TestValidator.predicate(
    "Shop name should be present",
    sellerSnapshot.shopName.length > 0,
  );
  TestValidator.predicate(
    "Created timestamp should be valid",
    new Date(sellerSnapshot.createdAt).getTime() > 0,
  );
}
