import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test retrieving a fully delivered order with complete shipment information.
 *
 * Validates the complete order delivery workflow including customer registration, seller setup, checkout, shipment creation, and delivery confirmation. Ensures that the order retrieval endpoint returns accurate data with all snapshots and shipment details preserved.
 *
 * Special attention is given to verifying that order items contain immutable snapshots of product and seller information as they existed at purchase time, and that shipment tracking information is correctly stored and retrievable.
 *
 * 1. Customer joins the platform with randomized credentials.
 * 2. Seller joins and authenticates to the platform.
 * 3. Customer places order via checkout (utility handles cart and product setup).
 * 4. Seller creates shipment for the order with carrier and tracking information.
 * 5. Customer confirms delivery for the shipment.
 * 6. Customer retrieves the delivered order and validates all fields.
 */
export async function test_api_order_retrieve_delivered_order_with_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: customerJoin });
  // 2. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerJoin });
  // 3. Customer places order via checkout (utility handles cart and product setup internally)
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        payment_token: "test_payment_token_12345",
      },
    },
  );
  typia.assert(order);
  // 4. Seller creates shipment for the order
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(15),
        order_item_ids: [order.items[0].id],
        order_id: order.id,
      },
    },
  );
  typia.assert(shipment);
  // 5. Customer confirms delivery
  await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 6. Customer retrieves the delivered order
  const retrievedOrder = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(retrievedOrder);
  // Validate order status is 'delivered'
  TestValidator.equals(
    "order item status is delivered",
    retrievedOrder.items[0].status,
    "delivered",
  );
  // Validate shipping address exists
  TestValidator.predicate(
    "shipping address exists",
    retrievedOrder.shippingAddress.id.length > 0,
  );
  // Validate shipments array contains the shipment
  TestValidator.predicate(
    "shipments array is not empty",
    retrievedOrder.shipments.length > 0,
  );
  const retrievedShipment = retrievedOrder.shipments[0];
  TestValidator.equals(
    "shipment carrier name matches",
    retrievedShipment.carrier_name,
    "FedEx",
  );
  TestValidator.equals(
    "shipment tracking number matches",
    retrievedShipment.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.predicate(
    "shipment delivered_at is set",
    retrievedShipment.delivered_at !== null,
  );
  // Validate order item snapshots
  const orderItem = retrievedOrder.items[0];
  TestValidator.predicate(
    "product_name snapshot exists",
    orderItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "product_description snapshot exists",
    orderItem.product_description.length > 0,
  );
  TestValidator.predicate(
    "variant_sku_code snapshot exists",
    orderItem.variant_sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant_price snapshot is positive",
    orderItem.variant_price > 0,
  );
  TestValidator.predicate(
    "seller_shop_name snapshot exists",
    orderItem.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "variantOptions snapshot is not empty",
    orderItem.variantOptions.length > 0,
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "order_number exists",
    retrievedOrder.order_number.length > 0,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedOrder.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedOrder.updated_at.length > 0,
  );
}
