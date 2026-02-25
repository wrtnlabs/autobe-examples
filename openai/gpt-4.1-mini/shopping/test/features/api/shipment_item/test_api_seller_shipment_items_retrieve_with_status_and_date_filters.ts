import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_items_retrieve_with_status_and_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // 2. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 3. Create multiple order items with different statuses
  const orderItemPaid =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: { status: "paid" },
      },
    );
  typia.assert(orderItemPaid);
  const orderItemShipped =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: { status: "shipped" },
      },
    );
  typia.assert(orderItemShipped);
  const orderItemDelivered =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: { status: "delivered" },
      },
    );
  typia.assert(orderItemDelivered);
  // 4. Create shipments using order items (seller)
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: "Carrier 1",
        trackingNumber: "TRACK123456",
        orderItemIds: [orderItemPaid.id, orderItemShipped.id],
      },
    },
  );
  typia.assert(shipment1);
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: "Carrier 2",
        trackingNumber: "TRACK654321",
        orderItemIds: [orderItemDelivered.id],
      },
    },
  );
  typia.assert(shipment2);
  // Small delay to ensure timestamps differ
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 5. Query shipment items filtering by status and createdAt range
  const now = new Date();
  const createdAtFrom = new Date(now.getTime() - 3600 * 1000).toISOString(); // 1 hour ago
  const createdAtTo = new Date(now.getTime() + 3600 * 1000).toISOString(); // 1 hour ahead
  // Filter by status 'shipped'
  const filterShipped =
    await api.functional.shoppingMall.seller.shipment_items.index(
      sellerConnection,
      {
        body: {
          status: "shipped",
          createdAtFrom,
          createdAtTo,
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(filterShipped);
  // All returned shipment items must have status 'shipped' and createdAt in range
  for (const item of filterShipped.data) {
    TestValidator.predicate(
      "shipment item status is shipped",
      item.orderItem.status === "shipped",
    );
    TestValidator.predicate(
      "shipment item createdAt within filter",
      item.created_at >= createdAtFrom && item.created_at <= createdAtTo,
    );
  }
  // Check pagination correctness
  TestValidator.predicate(
    "pagination current page should be 1",
    filterShipped.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 50",
    filterShipped.pagination.limit === 50,
  );
  // Edge case: query no matching results (createdAt range far in past)
  const pastFrom = new Date(now.getTime() - 86400 * 1000 * 10).toISOString(); // 10 days ago
  const pastTo = new Date(now.getTime() - 86400 * 1000 * 5).toISOString(); // 5 days ago
  const noResults =
    await api.functional.shoppingMall.seller.shipment_items.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          createdAtFrom: pastFrom,
          createdAtTo: pastTo,
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(noResults);
  // Should return empty data array
  TestValidator.equals("empty data array for no results", noResults.data, []);
}
