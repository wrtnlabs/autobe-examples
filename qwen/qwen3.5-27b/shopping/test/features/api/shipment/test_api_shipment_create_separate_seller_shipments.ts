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
 * Test that when an order contains items from multiple sellers, each seller creates their own separate shipment with independent tracking information.
 */
export async function test_api_shipment_create_separate_seller_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: "Seller A Shop",
      shop_description: "Seller A's shop",
    },
  });
  typia.assert(sellerA);
  // 2. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: "Seller B Shop",
      shop_description: "Seller B's shop",
    },
  });
  typia.assert(sellerB);
  // 3. Register and authenticate Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Customer creates an order containing items from both sellers
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Partition order items by seller
  const sellerAItems = order.orderItems.filter(
    (item) => item.sellerId === sellerA.id,
  );
  const sellerBItems = order.orderItems.filter(
    (item) => item.sellerId === sellerB.id,
  );
  // Verify we have items from both sellers
  TestValidator.predicate(
    "order contains items from Seller A",
    sellerAItems.length > 0,
  );
  TestValidator.predicate(
    "order contains items from Seller B",
    sellerBItems.length > 0,
  );
  // 5. Verify order items are in 'paid' status
  TestValidator.predicate(
    "all Seller A items are in paid status",
    sellerAItems.every((item) => item.status === "paid"),
  );
  TestValidator.predicate(
    "all Seller B items are in paid status",
    sellerBItems.every((item) => item.status === "paid"),
  );
  // 6. Seller A creates shipment with their order items
  const shipmentA =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerAConnection,
      {
        body: {
          order_item_ids: sellerAItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: "TRACK001",
        },
      },
    );
  typia.assert(shipmentA);
  // 7. Verify Seller A's shipment
  TestValidator.equals(
    "Seller A shipment tracking carrier",
    shipmentA.tracking_carrier,
    "FedEx",
  );
  TestValidator.equals(
    "Seller A shipment tracking number",
    shipmentA.tracking_number,
    "TRACK001",
  );
  TestValidator.equals(
    "Seller A shipment item count",
    shipmentA.orderItems.length,
    sellerAItems.length,
  );
  TestValidator.predicate(
    "Seller A shipment delivery not confirmed",
    shipmentA.delivery_confirmed === false,
  );
  // 8. Seller B creates shipment with their order items
  const shipmentB =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerBConnection,
      {
        body: {
          order_item_ids: sellerBItems.map((item) => item.id),
          tracking_carrier: "DHL",
          tracking_number: "TRACK002",
        },
      },
    );
  typia.assert(shipmentB);
  // 9. Verify Seller B's shipment
  TestValidator.equals(
    "Seller B shipment tracking carrier",
    shipmentB.tracking_carrier,
    "DHL",
  );
  TestValidator.equals(
    "Seller B shipment tracking number",
    shipmentB.tracking_number,
    "TRACK002",
  );
  TestValidator.equals(
    "Seller B shipment item count",
    shipmentB.orderItems.length,
    sellerBItems.length,
  );
  TestValidator.predicate(
    "Seller B shipment delivery not confirmed",
    shipmentB.delivery_confirmed === false,
  );
  // 10. Verify shipments are independent
  TestValidator.notEquals(
    "shipments have different IDs",
    shipmentA.id,
    shipmentB.id,
  );
  TestValidator.notEquals(
    "shipments have different tracking carriers",
    shipmentA.tracking_carrier,
    shipmentB.tracking_carrier,
  );
  TestValidator.notEquals(
    "shipments have different tracking numbers",
    shipmentA.tracking_number,
    shipmentB.tracking_number,
  );
  // 11. Verify each shipment has its own shipped_at timestamp
  TestValidator.predicate(
    "Seller A shipment has shipped_at",
    shipmentA.shipped_at != null,
  );
  TestValidator.predicate(
    "Seller B shipment has shipped_at",
    shipmentB.shipped_at != null,
  );
}
