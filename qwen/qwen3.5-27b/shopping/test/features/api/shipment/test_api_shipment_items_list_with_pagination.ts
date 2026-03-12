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

/**
 * Test listing shipment items with pagination as an administrator.
 * 1. Register and authenticate admin, customer, and seller
 * 2. Create an order with multiple items as customer
 * 3. Create a shipment with those order items as seller
 * 4. Admin retrieves paginated shipment items
 * 5. Validate pagination metadata and item structure
 */
export async function test_api_shipment_items_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    },
  });
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    },
  });
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    },
  });
  // 4. Create an order with multiple items as customer
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Create a shipment with order items as seller
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order.orderItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: "1234567890",
        },
      },
    );
  typia.assert(shipment);
  // 6. Admin retrieves paginated shipment items (page 1, limit 10)
  const page1 = await api.functional.shoppingMall.admin.shipments.items.index(
    adminConnection,
    {
      shipmentId: shipment.id,
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(page1);
  // 7. Validate pagination metadata
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate("has records", page1.pagination.records > 0);
  TestValidator.predicate("has pages", page1.pagination.pages >= 1);
  // 8. Validate shipment item structure and data integrity
  if (page1.data.length > 0) {
    const item = page1.data[0];
    // Validate order item details match the original order
    TestValidator.equals("order id matches", item.orderItem.orderId, order.id);
    TestValidator.predicate(
      "status is valid",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.orderItem.status,
      ),
    );
    TestValidator.predicate(
      "quantity is positive",
      item.orderItem.quantity > 0,
    );
    TestValidator.predicate("price is non-negative", item.orderItem.price >= 0);
    // Validate shipment details match the created shipment
    TestValidator.equals("shipment id matches", item.shipment.id, shipment.id);
    TestValidator.equals(
      "tracking carrier matches",
      item.shipment.tracking_carrier,
      "FedEx",
    );
    TestValidator.equals(
      "tracking number matches",
      item.shipment.tracking_number,
      "1234567890",
    );
    TestValidator.predicate(
      "delivery confirmed is boolean",
      typeof item.shipment.delivery_confirmed === "boolean",
    );
  }
  // 9. Test pagination with smaller limit to verify page calculation
  const page2 = await api.functional.shoppingMall.admin.shipments.items.index(
    adminConnection,
    {
      shipmentId: shipment.id,
      body: {
        page: 1,
        limit: 1,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 1", page2.pagination.current, 1);
  TestValidator.equals("page 2 limit is 1", page2.pagination.limit, 1);
  TestValidator.equals(
    "total records consistent",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    page2.pagination.pages >= page1.pagination.pages,
  );
  // 10. Verify items are sorted by created_at in descending order
  if (page1.data.length >= 2) {
    const firstItem = page1.data[0];
    const secondItem = page1.data[1];
    TestValidator.predicate(
      "items sorted by created_at desc",
      new Date(firstItem.created_at) >= new Date(secondItem.created_at),
    );
  }
}
