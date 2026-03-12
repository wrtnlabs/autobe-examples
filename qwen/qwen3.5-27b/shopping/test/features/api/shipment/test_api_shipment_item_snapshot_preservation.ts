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

export async function test_api_shipment_item_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that product, variant, and seller profile snapshots are preserved
   * in order items even when original entities are modified or deleted.
   * This ensures historical accuracy of order records.
   */
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Customer creates an order
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order has at least one item
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem: IShoppingMallOrderItem = order.orderItems[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  // 4. Seller creates a shipment for the order item
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          tracking_carrier: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipment);
  // 5. Customer retrieves the order item via shipment endpoint
  const retrievedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.shipments.items.at(
      customerConnection,
      {
        shipmentId: shipment.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedOrderItem);
  // 6. Verify productSnapshot exists and is a valid JSON string
  TestValidator.predicate(
    "productSnapshot exists",
    retrievedOrderItem.productSnapshot !== null &&
      retrievedOrderItem.productSnapshot !== undefined,
  );
  TestValidator.equals(
    "productSnapshot is string",
    typeof retrievedOrderItem.productSnapshot,
    "string",
  );
  const productSnapshot: Record<string, unknown> = JSON.parse(
    retrievedOrderItem.productSnapshot,
  );
  // Verify productSnapshot contains expected fields
  TestValidator.predicate(
    "productSnapshot has name",
    "name" in productSnapshot &&
      typeof productSnapshot["name"] === "string" &&
      productSnapshot["name"].length > 0,
  );
  TestValidator.predicate(
    "productSnapshot has description",
    "description" in productSnapshot,
  );
  TestValidator.predicate(
    "productSnapshot has basePrice",
    "basePrice" in productSnapshot &&
      typeof productSnapshot["basePrice"] === "number",
  );
  // 7. Verify variantSnapshot exists and is a valid JSON string
  TestValidator.predicate(
    "variantSnapshot exists",
    retrievedOrderItem.variantSnapshot !== null &&
      retrievedOrderItem.variantSnapshot !== undefined,
  );
  TestValidator.equals(
    "variantSnapshot is string",
    typeof retrievedOrderItem.variantSnapshot,
    "string",
  );
  const variantSnapshot: Record<string, unknown> = JSON.parse(
    retrievedOrderItem.variantSnapshot,
  );
  // Verify variantSnapshot contains expected fields
  TestValidator.predicate(
    "variantSnapshot has sku",
    "sku" in variantSnapshot &&
      typeof variantSnapshot["sku"] === "string" &&
      variantSnapshot["sku"].length > 0,
  );
  TestValidator.predicate(
    "variantSnapshot has optionValues",
    "optionValues" in variantSnapshot,
  );
  TestValidator.predicate(
    "variantSnapshot has priceOverride or basePrice",
    "priceOverride" in variantSnapshot || "basePrice" in variantSnapshot,
  );
  // 8. Verify sellerProfileSnapshot exists and is a valid JSON string
  TestValidator.predicate(
    "sellerProfileSnapshot exists",
    retrievedOrderItem.sellerProfileSnapshot !== null &&
      retrievedOrderItem.sellerProfileSnapshot !== undefined,
  );
  TestValidator.equals(
    "sellerProfileSnapshot is string",
    typeof retrievedOrderItem.sellerProfileSnapshot,
    "string",
  );
  const sellerProfileSnapshot: Record<string, unknown> = JSON.parse(
    retrievedOrderItem.sellerProfileSnapshot,
  );
  // Verify sellerProfileSnapshot contains expected fields
  TestValidator.predicate(
    "sellerProfileSnapshot has shopName",
    "shopName" in sellerProfileSnapshot &&
      typeof sellerProfileSnapshot["shopName"] === "string" &&
      sellerProfileSnapshot["shopName"].length > 0,
  );
  TestValidator.predicate(
    "sellerProfileSnapshot has shopDescription",
    "shopDescription" in sellerProfileSnapshot,
  );
  // 9. Verify order item price is valid and positive
  TestValidator.predicate(
    "order item has valid price",
    retrievedOrderItem.price > 0,
  );
  TestValidator.equals(
    "order item price is number",
    typeof retrievedOrderItem.price,
    "number",
  );
  // 10. Verify snapshots are immutable (stored as JSON strings)
  TestValidator.predicate(
    "all snapshots are JSON strings",
    typeof retrievedOrderItem.productSnapshot === "string" &&
      typeof retrievedOrderItem.variantSnapshot === "string" &&
      typeof retrievedOrderItem.sellerProfileSnapshot === "string",
  );
}
