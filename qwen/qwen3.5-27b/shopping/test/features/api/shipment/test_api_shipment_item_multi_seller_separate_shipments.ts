import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that customers can view order items from multi-seller orders where each seller creates separate shipments.
 *
 * This test validates the multi-seller shipment isolation feature where:
 * 1. A customer places an order containing products from multiple sellers
 * 2. Each seller creates their own separate shipment for their order items
 * 3. Each shipment has independent tracking information
 * 4. Customer can view order items and verify correct tracking info per seller
 */
export async function test_api_shipment_item_multi_seller_separate_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller A setup - register and authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  // 3. Seller B setup - register and authenticate
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  // 4. Customer creates order containing items from both sellers
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get order items grouped by seller
  const sellerAItems = order.orderItems.filter(
    (item) => item.sellerId === sellerAAuth.id,
  );
  const sellerBItems = order.orderItems.filter(
    (item) => item.sellerId === sellerBAuth.id,
  );
  // Validate we have items from both sellers
  TestValidator.predicate(
    "order contains items from seller A",
    sellerAItems.length > 0,
  );
  TestValidator.predicate(
    "order contains items from seller B",
    sellerBItems.length > 0,
  );
  // 5. Seller A creates shipment for their order items
  const shipmentA =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerAConnection,
      {
        body: {
          order_item_ids: sellerAItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string>(),
        },
      },
    );
  typia.assert(shipmentA);
  // 6. Seller B creates separate shipment for their order items
  const shipmentB =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerBConnection,
      {
        body: {
          order_item_ids: sellerBItems.map((item) => item.id),
          tracking_carrier: "UPS",
          tracking_number: typia.random<string>(),
        },
      },
    );
  typia.assert(shipmentB);
  // Validate shipments are different
  TestValidator.notEquals(
    "shipments are separate records",
    shipmentA.id,
    shipmentB.id,
  );
  TestValidator.notEquals(
    "tracking carriers are different",
    shipmentA.tracking_carrier,
    shipmentB.tracking_carrier,
  );
  TestValidator.notEquals(
    "tracking numbers are different",
    shipmentA.tracking_number,
    shipmentB.tracking_number,
  );
  // 7. Customer retrieves order item from seller A's shipment
  const orderItemA = sellerAItems[0];
  const retrievedItemA =
    await api.functional.shoppingMall.customer.shipments.items.at(
      customerConnection,
      {
        shipmentId: shipmentA.id,
        itemId: orderItemA.id,
      },
    );
  typia.assert(retrievedItemA);
  // 8. Customer retrieves order item from seller B's shipment
  const orderItemB = sellerBItems[0];
  const retrievedItemB =
    await api.functional.shoppingMall.customer.shipments.items.at(
      customerConnection,
      {
        shipmentId: shipmentB.id,
        itemId: orderItemB.id,
      },
    );
  typia.assert(retrievedItemB);
  // 9. Validate order item A shows seller A's shipment info
  TestValidator.equals(
    "order item A belongs to correct shipment",
    retrievedItemA.id,
    orderItemA.id,
  );
  TestValidator.predicate(
    "order item A has shipments array",
    retrievedItemA.shipments.length > 0,
  );
  TestValidator.equals(
    "order item A shipment has correct carrier",
    retrievedItemA.shipments[0].tracking_carrier,
    shipmentA.tracking_carrier,
  );
  TestValidator.equals(
    "order item A shipment has correct tracking number",
    retrievedItemA.shipments[0].tracking_number,
    shipmentA.tracking_number,
  );
  // 10. Validate order item B shows seller B's shipment info
  TestValidator.equals(
    "order item B belongs to correct shipment",
    retrievedItemB.id,
    orderItemB.id,
  );
  TestValidator.predicate(
    "order item B has shipments array",
    retrievedItemB.shipments.length > 0,
  );
  TestValidator.equals(
    "order item B shipment has correct carrier",
    retrievedItemB.shipments[0].tracking_carrier,
    shipmentB.tracking_carrier,
  );
  TestValidator.equals(
    "order item B shipment has correct tracking number",
    retrievedItemB.shipments[0].tracking_number,
    shipmentB.tracking_number,
  );
  // 11. Validate shipment isolation - order item A should not have seller B's shipment
  TestValidator.predicate(
    "order item A does not contain seller B's shipment",
    !retrievedItemA.shipments.some((s) => s.id === shipmentB.id),
  );
  // 12. Validate shipment isolation - order item B should not have seller A's shipment
  TestValidator.predicate(
    "order item B does not contain seller A's shipment",
    !retrievedItemB.shipments.some((s) => s.id === shipmentA.id),
  );
}
