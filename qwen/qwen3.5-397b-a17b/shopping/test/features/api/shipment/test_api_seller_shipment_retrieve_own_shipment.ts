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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller shipment retrieval for own shipment.
 *
 * Validates that a seller can successfully retrieve detailed information about a shipment they created. The test establishes a complete order fulfillment workflow including seller product creation, customer order placement, shipment creation with tracking information, and final shipment detail retrieval.
 *
 * The test verifies that the shipment response contains all required fields including carrier information, tracking numbers, timestamps, order reference, seller reference, and order items with correct shipped status.
 *
 * 1. Seller registers and authenticates via join endpoint.
 * 2. Seller creates a product with at least one variant containing inventory.
 * 3. Customer (member) registers and places an order containing the seller's product variant.
 * 4. Seller creates a shipment for the order items with carrier name and tracking number.
 * 5. Seller retrieves the shipment details via GET endpoint.
 * 6. Validates shipment contains correct carrier_name, tracking_number, order reference, seller reference, and order items with shipped status.
 */
export async function test_api_seller_shipment_retrieve_own_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates product with variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
        },
      },
    );
  typia.assert(variant);
  // 3. Customer joins and places order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerAuth);
  // Customer creates order (internally handles cart and address setup)
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(order);
  // 4. Seller creates shipment for order items
  const orderItemsForSeller = order.orderItems.filter(
    (item) => item.seller.id === sellerAuth.id,
  );
  if (orderItemsForSeller.length === 0) {
    throw new Error("No order items found for seller");
  }
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: orderItemsForSeller.map((item) => item.id),
          carrier_name: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "USPS",
            "Korea Post",
          ]),
          tracking_number: RandomGenerator.alphaNumeric(12).toUpperCase(),
        },
      },
    );
  typia.assert(shipment);
  // 5. Seller retrieves shipment details
  const retrievedShipment =
    await api.functional.shoppingMall.seller.seller.shipments.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(retrievedShipment);
  // 6. Validation
  TestValidator.equals(
    "shipment id matches",
    retrievedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "carrier name matches",
    retrievedShipment.carrier_name,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.predicate(
    "shipped_at is set",
    retrievedShipment.shipped_at !== null,
  );
  TestValidator.predicate(
    "shipped_at is after order created_at",
    new Date(retrievedShipment.shipped_at).getTime() >=
      new Date(order.created_at).getTime(),
  );
  TestValidator.equals(
    "order id matches",
    retrievedShipment.order.id,
    order.id,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedShipment.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "order items array not empty",
    retrievedShipment.orderItems.length > 0,
  );
  TestValidator.predicate(
    "all order items have shipped status",
    retrievedShipment.orderItems.every((item) => item.status === "shipped"),
  );
  // Verify delivered_at is null or valid timestamp
  if (retrievedShipment.delivered_at !== null) {
    TestValidator.predicate(
      "delivered_at is valid date-time",
      !isNaN(new Date(retrievedShipment.delivered_at!).getTime()),
    );
  }
}
