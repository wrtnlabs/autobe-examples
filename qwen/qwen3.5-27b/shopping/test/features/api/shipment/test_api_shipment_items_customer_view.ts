import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
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
 * Test that a customer can retrieve paginated order items from a shipment they purchased.
 *
 * This test verifies the complete customer journey for viewing shipment contents:
 * 1. Customer registration and authentication
 * 2. Seller registration and authentication
 * 3. Order creation with multiple items
 * 4. Shipment creation by seller
 * 5. Customer viewing shipment items with pagination
 */
export async function test_api_shipment_items_customer_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Customer creates an order with multiple items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order was created successfully
  TestValidator.predicate("order has valid ID", order.id.length > 0);
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 4. Seller creates a shipment bundling the order items
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: orderItemIds,
          tracking_carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(20),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Verify shipment was created successfully
  TestValidator.predicate("shipment has valid ID", shipment.id.length > 0);
  TestValidator.equals(
    "shipment tracking carrier",
    shipment.tracking_carrier,
    "FedEx",
  );
  TestValidator.predicate(
    "shipment has tracking number",
    shipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "shipment shipped_at is set",
    shipment.shipped_at.length > 0,
  );
  TestValidator.equals(
    "delivery not yet confirmed",
    shipment.delivery_confirmed,
    false,
  );
  // 5. Customer retrieves paginated shipment items
  const shipmentItemsPage =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          status: "shipped",
          sort: "created_at desc",
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(shipmentItemsPage);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    shipmentItemsPage.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", shipmentItemsPage.pagination.limit, 20);
  TestValidator.predicate(
    "total records > 0",
    shipmentItemsPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages >= 1",
    shipmentItemsPage.pagination.pages >= 1,
  );
  // 7. Validate shipment items data
  TestValidator.equals(
    "shipment items count matches order items",
    shipmentItemsPage.data.length,
    order.orderItems.length,
  );
  // 8. Validate each shipment item structure
  for (const shipmentItem of shipmentItemsPage.data) {
    typia.assert(shipmentItem);
    // Validate shipment details
    TestValidator.equals(
      "shipment ID matches",
      shipmentItem.shipment.id,
      shipment.id,
    );
    TestValidator.equals(
      "tracking carrier matches",
      shipmentItem.shipment.tracking_carrier,
      "FedEx",
    );
    TestValidator.equals(
      "tracking number matches",
      shipmentItem.shipment.tracking_number,
      shipment.tracking_number,
    );
    TestValidator.predicate(
      "shipped_at is set",
      shipmentItem.shipment.shipped_at.length > 0,
    );
    TestValidator.equals(
      "delivery not confirmed",
      shipmentItem.shipment.delivery_confirmed,
      false,
    );
    // Validate order item details
    TestValidator.predicate(
      "order item has valid ID",
      shipmentItem.orderItem.id.length > 0,
    );
    TestValidator.predicate(
      "quantity is positive",
      shipmentItem.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "price is positive",
      shipmentItem.orderItem.price > 0,
    );
    TestValidator.equals(
      "order item status is shipped",
      shipmentItem.orderItem.status,
      "shipped",
    );
    TestValidator.predicate(
      "product snapshot exists",
      typeof shipmentItem.orderItem.productSnapshot === "object",
    );
    TestValidator.predicate(
      "variant snapshot exists",
      typeof shipmentItem.orderItem.variantSnapshot === "object",
    );
    TestValidator.predicate(
      "created_at is set",
      shipmentItem.orderItem.createdAt.length > 0,
    );
  }
  // 9. Test pagination with different parameters
  const secondPage =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page current is 1",
    secondPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "second page limit is 5",
    secondPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "second page records match first",
    secondPage.pagination.records,
    shipmentItemsPage.pagination.records,
  );
  // 10. Test status filtering
  const shippedItems =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          status: "shipped",
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(shippedItems);
  TestValidator.predicate(
    "all items have shipped status",
    shippedItems.data.every((item) => item.orderItem.status === "shipped"),
  );
}
