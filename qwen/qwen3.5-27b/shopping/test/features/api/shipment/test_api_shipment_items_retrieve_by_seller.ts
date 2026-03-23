import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
 * Test that a seller can retrieve all order items included in their shipment.
 *
 * This test validates the complete workflow:
 * 1. Seller and customer registration/authentication
 * 2. Customer order creation with multiple items
 * 3. Seller shipment creation bundling order items
 * 4. Retrieval of shipment items with proper pagination and status verification
 */
export async function test_api_shipment_items_retrieve_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(2),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
  // 2. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: customerJoinBody });
  // 3. Customer creates an order (using utility function)
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order was created successfully
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  TestValidator.equals("order status is paid", order.status, "paid");
  // 4. Seller creates a shipment bundling the order items
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipmentCreateBody = {
    order_item_ids: orderItemIds,
    tracking_carrier: RandomGenerator.name(1),
    tracking_number: RandomGenerator.alphaNumeric(20),
  } satisfies IShoppingMallShipment.ICreate;
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      { body: shipmentCreateBody },
    );
  typia.assert(shipment);
  // Verify shipment was created
  TestValidator.equals(
    "shipment item count",
    shipment.orderItems.length,
    orderItemIds.length,
  );
  TestValidator.predicate(
    "tracking carrier provided",
    shipment.tracking_carrier.length > 0,
  );
  // 5. Seller retrieves shipment items
  const requestBody = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrderItem.IRequest;
  const response =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: requestBody,
      },
    );
  typia.assert(response);
  // 6. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    response.pagination.limit,
    requestBody.limit,
  );
  TestValidator.equals(
    "total records matches shipment items",
    response.pagination.records,
    orderItemIds.length,
  );
  TestValidator.predicate(
    "pages is at least 1",
    response.pagination.pages >= 1,
  );
  // 7. Verify order items in response
  TestValidator.equals(
    "data array length matches records",
    response.data.length,
    response.pagination.records,
  );
  // 8. Verify each order item has correct structure and status
  await ArrayUtil.asyncForEach(response.data, async (item, index) => {
    // Verify required fields exist
    TestValidator.predicate(`item ${index} has id`, item.id.length > 0);
    TestValidator.equals(
      `item ${index} has correct orderId`,
      item.orderId,
      order.id,
    );
    TestValidator.predicate(`item ${index} has quantity`, item.quantity >= 1);
    TestValidator.predicate(`item ${index} has price`, item.price >= 0);
    TestValidator.predicate(
      `item ${index} has productSnapshot`,
      typeof item.productSnapshot === "object",
    );
    TestValidator.predicate(
      `item ${index} has variantSnapshot`,
      typeof item.variantSnapshot === "object",
    );
    TestValidator.predicate(
      `item ${index} has createdAt`,
      item.createdAt.length > 0,
    );
    // Verify status is 'shipped' (automatically updated when shipment was created)
    TestValidator.equals(
      `item ${index} status is shipped`,
      item.status,
      "shipped",
    );
  });
  // 9. Verify all original order items are present in the response
  const responseItemIds = response.data.map((item) => item.id);
  TestValidator.predicate(
    "all order items are in response",
    orderItemIds.every((id) => responseItemIds.includes(id)),
  );
}
