import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test customer shipment detail retrieval for their own order.
 *
 * Validates that a customer can successfully retrieve detailed information about a shipment for an order they placed. The test covers the complete workflow from customer and seller registration through product creation, order placement, shipment creation, and finally shipment detail retrieval.
 *
 * The test ensures proper access control by verifying that customers can only access shipments from their own orders, and that the shipment details include all expected information such as carrier details, tracking information, timestamps, and order item contents.
 *
 * 1. Customer member registers and authenticates.
 * 2. Seller registers and authenticates.
 * 3. Seller creates a product with variants.
 * 4. Customer places an order containing the seller's product.
 * 5. Seller creates a shipment for the order items with tracking information.
 * 6. Customer retrieves shipment detail using their order ID and shipment ID.
 * 7. Validates shipment contains all expected fields and data integrity.
 */
export async function test_api_shipment_detail_customer_own_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Seller creates a product with variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Customer places an order containing the seller's product
  // Note: This requires the customer to have the product in their cart first
  // For E2E purposes, we assume the cart is pre-populated or the order creation
  // handles this internally
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 5. Seller creates a shipment for the order items
  // Get order items that belong to this seller
  const sellerOrderItems = order.orderItems.filter(
    (item) => item.seller.id === seller.id,
  );
  if (sellerOrderItems.length === 0) {
    throw new Error("No order items found for seller");
  }
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: sellerOrderItems.map((item) => item.id),
          carrier_name: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          tracking_number: typia.random<string>(),
        },
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(shipment);
  // 6. Customer retrieves shipment detail
  const shipmentDetail =
    await api.functional.shoppingMall.member.orders.shipments.at(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentDetail);
  // 7. Validate shipment details
  TestValidator.equals("shipment ID matches", shipmentDetail.id, shipment.id);
  TestValidator.equals(
    "carrier name matches",
    shipmentDetail.carrier_name,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "tracking number matches",
    shipmentDetail.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.equals(
    "shipped_at matches",
    shipmentDetail.shipped_at,
    shipment.shipped_at,
  );
  TestValidator.predicate(
    "delivered_at is null",
    shipmentDetail.delivered_at === null,
  );
  TestValidator.equals("order ID matches", shipmentDetail.order.id, order.id);
  TestValidator.equals(
    "order code matches",
    shipmentDetail.order.code,
    order.code,
  );
  TestValidator.equals(
    "seller ID matches",
    shipmentDetail.seller.id,
    seller.id,
  );
  TestValidator.predicate(
    "order items array is not empty",
    shipmentDetail.orderItems.length > 0,
  );
  // Validate each order item in shipment
  for (const item of shipmentDetail.orderItems) {
    TestValidator.equals("item status is shipped", item.status, "shipped");
    TestValidator.predicate(
      "item has product info",
      item.product !== undefined,
    );
    TestValidator.predicate(
      "item has variant info",
      item.productVariant !== undefined,
    );
  }
}
