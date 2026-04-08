import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving seller snapshots in a multi-seller order scenario.
 * Validates that each order item maintains its correct seller snapshot association.
 */
export async function test_api_order_item_seller_snapshot_multi_seller_order_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. List orders to find potential multi-seller orders
  const orderListRequest: IEcommerceMallOrder.IRequest = {
    page: 1,
    limit: 20,
  };
  const orderListResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: orderListRequest,
    });
  typia.assert(orderListResponse);
  // 3. Find an order with items from multiple sellers
  let multiSellerOrder: IEcommerceMallOrder.ISummary | null = null;
  const orderItemsByOrder = new Map<
    string,
    IEcommerceMallOrderItem.ISummary[]
  >();
  for (const order of orderListResponse.data) {
    const itemListRequest: IEcommerceMallOrderItem.IRequest = {
      orderId: order.id,
      page: 1,
      limit: 100,
    };
    const itemListResponse =
      await api.functional.ecommerceMall.admin.items.index(adminConnection, {
        body: itemListRequest,
      });
    typia.assert(itemListResponse);
    // Check if order has items from multiple different sellers
    const sellerIds = new Set(
      itemListResponse.data.map((item) => item.seller.id),
    );
    if (sellerIds.size >= 2) {
      multiSellerOrder = order;
      orderItemsByOrder.set(order.id, itemListResponse.data);
      break;
    }
  }
  // Validate we found a multi-seller order
  TestValidator.predicate(
    "found multi-seller order",
    multiSellerOrder !== null,
  );
  if (multiSellerOrder === null) {
    return;
  }
  const orderItems = orderItemsByOrder.get(multiSellerOrder.id)!;
  const uniqueSellers = new Map<string, IEcommerceMallOrderItem.ISummary[]>();
  // Group items by seller
  for (const item of orderItems) {
    if (!uniqueSellers.has(item.seller.id)) {
      uniqueSellers.set(item.seller.id, []);
    }
    uniqueSellers.get(item.seller.id)!.push(item);
  }
  // 4. Retrieve seller snapshots for items from different sellers
  const snapshots = new Map<string, IEcommerceMallOrderItemSellerSnapshot>();
  for (const [sellerId, items] of uniqueSellers) {
    // Take first item from each seller
    const item = items[0];
    const snapshot =
      await api.functional.ecommerceMall.admin.orders.items.sellerSnapshot.at(
        adminConnection,
        {
          orderId: multiSellerOrder.id,
          orderItemId: item.id,
        },
      );
    typia.assert(snapshot);
    snapshots.set(sellerId, snapshot);
    // 5. Validation: Verify snapshot belongs to the correct seller
    TestValidator.equals(
      `snapshot seller id matches order item seller id for seller ${sellerId}`,
      snapshot.id,
      item.seller.id,
    );
  }
  // 6. Validation: Ensure different sellers have different snapshots
  if (uniqueSellers.size >= 2) {
    const sellerIds = Array.from(uniqueSellers.keys());
    const firstSellerId = sellerIds[0];
    const secondSellerId = sellerIds[1];
    const firstSnapshot = snapshots.get(firstSellerId)!;
    const secondSnapshot = snapshots.get(secondSellerId)!;
    // Snapshots should be different objects with different IDs
    TestValidator.notEquals(
      "different sellers have different snapshots",
      firstSnapshot.id,
      secondSnapshot.id,
    );
    // Each snapshot should have valid shopName
    TestValidator.predicate(
      "first snapshot has shopName",
      firstSnapshot.shopName.length > 0,
    );
    TestValidator.predicate(
      "second snapshot has shopName",
      secondSnapshot.shopName.length > 0,
    );
  }
}
