import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test order retrieval when an order contains multiple shipments from different sellers.
 *
 * Validates the complete multi-seller order fulfillment flow including member registration, two seller accounts with products, cart operations, order placement, and independent shipment creation by each seller. Ensures that the order retrieval correctly returns all shipments with their respective order items and tracking information.
 *
 * Special attention is given to verifying that different sellers create separate shipments even for items in the same order, each shipment contains only order items from its respective seller, and customers can track each shipment independently through the order details.
 *
 * 1. Member registers and authenticates.
 * 2. Seller A registers and creates product A with variant A.
 * 3. Seller B registers and creates product B with variant B.
 * 4. Member adds both variants to cart.
 * 5. Member places order containing items from both sellers.
 * 6. Seller A creates shipment for their order item.
 * 7. Seller B creates shipment for their order item.
 * 8. Member retrieves order and validates shipment structure.
 */
export async function test_api_order_retrieval_with_multiple_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Seller A registration and product creation
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAAuth);
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
      },
    );
  typia.assert(variantA);
  // 3. Seller B registration and product creation
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerBAuth);
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {},
  );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
      },
    );
  typia.assert(variantB);
  // 4. Member adds both variants to cart
  const cartItemA =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variantA.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItemA);
  const cartItemB =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variantB.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItemB);
  // 5. Member places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 6. Seller A creates shipment for their order item
  const sellerAOrderItems = order.orderItems.filter(
    (item) => item.seller.id === sellerAAuth.id,
  );
  const shipmentA =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: sellerAOrderItems.map((item) => item.id),
          carrier_name: "Carrier A",
          tracking_number: `TRACK-A-${RandomGenerator.alphaNumeric(10)}`,
        },
      },
    );
  typia.assert(shipmentA);
  // 7. Seller B creates shipment for their order item
  const sellerBOrderItems = order.orderItems.filter(
    (item) => item.seller.id === sellerBAuth.id,
  );
  const shipmentB =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerBConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: sellerBOrderItems.map((item) => item.id),
          carrier_name: "Carrier B",
          tracking_number: `TRACK-B-${RandomGenerator.alphaNumeric(10)}`,
        },
      },
    );
  typia.assert(shipmentB);
  // 8. Member retrieves order and validates
  const retrievedOrder = await api.functional.shoppingMall.member.orders.at(
    memberConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(retrievedOrder);
  // Validate order structure
  TestValidator.equals("order ID matches", retrievedOrder.id, order.id);
  TestValidator.equals("order code matches", retrievedOrder.code, order.code);
  TestValidator.equals(
    "total price matches",
    retrievedOrder.total_price,
    order.total_price,
  );
  // Validate exactly 2 shipments exist
  TestValidator.equals("shipment count", retrievedOrder.shipments.length, 2);
  // Validate each shipment has correct seller
  const shipmentASeller = retrievedOrder.shipments.find(
    (s) => s.seller.id === sellerAAuth.id,
  );
  const shipmentBSeller = retrievedOrder.shipments.find(
    (s) => s.seller.id === sellerBAuth.id,
  );
  TestValidator.predicate(
    "Seller A shipment exists",
    shipmentASeller !== undefined,
  );
  TestValidator.predicate(
    "Seller B shipment exists",
    shipmentBSeller !== undefined,
  );
  // Validate distinct carrier names and tracking numbers
  if (shipmentASeller && shipmentBSeller) {
    TestValidator.notEquals(
      "carrier names differ",
      shipmentASeller.carrier_name,
      shipmentBSeller.carrier_name,
    );
    TestValidator.notEquals(
      "tracking numbers differ",
      shipmentASeller.tracking_number,
      shipmentBSeller.tracking_number,
    );
    // Validate each shipment contains correct order items
    TestValidator.equals(
      "Shipment A order items count",
      shipmentASeller.orderItems.length,
      sellerAOrderItems.length,
    );
    TestValidator.equals(
      "Shipment B order items count",
      shipmentBSeller.orderItems.length,
      sellerBOrderItems.length,
    );
    // Validate order items in shipments reference correct seller
    shipmentASeller.orderItems.forEach((item) => {
      TestValidator.equals(
        `Shipment A item ${item.id} seller`,
        item.seller.id,
        sellerAAuth.id,
      );
    });
    shipmentBSeller.orderItems.forEach((item) => {
      TestValidator.equals(
        `Shipment B item ${item.id} seller`,
        item.seller.id,
        sellerBAuth.id,
      );
    });
    // Validate shipped_at timestamps exist
    TestValidator.predicate(
      "Shipment A has shipped_at",
      shipmentASeller.shipped_at !== null,
    );
    TestValidator.predicate(
      "Shipment B has shipped_at",
      shipmentBSeller.shipped_at !== null,
    );
  }
  // Validate all order items have shipment assigned
  retrievedOrder.orderItems.forEach((item) => {
    TestValidator.predicate(
      `Order item ${item.id} has shipment`,
      item.shipment !== null,
    );
  });
}
