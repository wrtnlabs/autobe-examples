import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/admin",
    },
  });
  // 2. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://test.com/customer",
      referrer: "https://test.com/customer",
    },
  });
  // 3. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://test.com/seller",
      referrer: "https://test.com/seller",
    },
  });
  // 4. Create an order with multiple items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Create a shipment containing the order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order.orderItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string>(),
        },
      },
    );
  typia.assert(shipment);
  // 6. Test filtering by "shipped" status (items should be in shipped status after shipment creation)
  const shippedFilterResult =
    await api.functional.shoppingMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          status: "shipped",
        },
      },
    );
  typia.assert(shippedFilterResult);
  // Validate that all returned items have "shipped" status
  TestValidator.predicate(
    "all items have shipped status",
    shippedFilterResult.data.every(
      (item) => item.orderItem.status === "shipped",
    ),
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    shippedFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    shippedFilterResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    shippedFilterResult.pagination.records === shippedFilterResult.data.length,
  );
  // 7. Test filtering by "paid" status (should return empty since items were shipped)
  const paidFilterResult =
    await api.functional.shoppingMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          status: "paid",
        },
      },
    );
  typia.assert(paidFilterResult);
  // Validate empty results for "paid" status
  TestValidator.equals(
    "no paid items in shipment",
    paidFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    paidFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    paidFilterResult.pagination.pages,
    0,
  );
  // 8. Test filtering by "delivered" status (should return empty)
  const deliveredFilterResult =
    await api.functional.shoppingMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          status: "delivered",
        },
      },
    );
  typia.assert(deliveredFilterResult);
  TestValidator.equals(
    "no delivered items in shipment",
    deliveredFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for delivered",
    deliveredFilterResult.pagination.records,
    0,
  );
  // 9. Test without status filter (should return all items)
  const allItemsResult =
    await api.functional.shoppingMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(allItemsResult);
  // Validate that all items are returned without filter
  TestValidator.predicate(
    "all items returned without filter",
    allItemsResult.data.length > 0,
  );
  TestValidator.predicate(
    "all items have shipped status",
    allItemsResult.data.every((item) => item.orderItem.status === "shipped"),
  );
  // 10. Test pagination with filter
  const paginatedResult =
    await api.functional.shoppingMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 5,
          status: "shipped",
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit is 5",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records matches filtered count",
    paginatedResult.pagination.records === paginatedResult.data.length,
  );
}
