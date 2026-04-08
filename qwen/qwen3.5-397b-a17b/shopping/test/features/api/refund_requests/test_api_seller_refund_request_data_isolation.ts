import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller refund request data isolation to ensure sellers can only view refund requests for their own products.
 *
 * Validates the complete refund request data isolation workflow including multi-seller setup, customer order placement with products from different sellers, and verification that each seller can only access refund requests related to their own products. This test ensures proper data isolation at the seller level for refund request queries.
 *
 * The test creates two distinct seller accounts (Seller A and Seller B), each with their own products and variants. A customer places orders containing items from both sellers, creates shipments through each seller, and submits refund requests for delivered items. The core validation confirms that when each seller queries refund requests, they only see requests for their own products, not those belonging to other sellers.
 *
 * 1. Seller A registers and creates a product with variants.
 * 2. Seller B registers and creates a product with variants.
 * 3. Customer registers and adds products from both sellers to cart.
 * 4. Customer places order containing items from both sellers.
 * 5. Seller A creates shipment for their order items.
 * 6. Seller B creates shipment for their order items.
 * 7. Customer creates refund requests for items from both sellers.
 * 8. Seller A queries refund requests - should only see their own.
 * 9. Seller B queries refund requests - should only see their own.
 * 10. Validate data isolation: each seller sees only their refund requests.
 */
export async function test_api_seller_refund_request_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A setup - register and create product
  const sellerAJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAJoin);
  const sellerAConnection: api.IConnection = { host: connection.host };
  sellerAConnection.headers = { Authorization: sellerAJoin.token.access };
  const productA =
    await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      { params: { productId: productA.id } },
    );
  typia.assert(variantA);
  // 2. Seller B setup - register and create product
  const sellerBJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBJoin);
  const sellerBConnection: api.IConnection = { host: connection.host };
  sellerBConnection.headers = { Authorization: sellerBJoin.token.access };
  const productB =
    await generate_random_shopping_mall_seller_products_create(
      sellerBConnection,
      {},
    );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      { params: { productId: productB.id } },
    );
  typia.assert(variantB);
  // 3. Customer setup - register and add items to cart
  const customerJoin = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customerJoin.token.access };
  // Add product A to cart
  const cartItemA =
    await generate_random_shopping_mall_member_cart_items_create(
      customerConnection,
      { body: { product_variant_id: variantA.id, quantity: 1 } },
    );
  typia.assert(cartItemA);
  // Add product B to cart
  const cartItemB =
    await generate_random_shopping_mall_member_cart_items_create(
      customerConnection,
      { body: { product_variant_id: variantB.id, quantity: 1 } },
    );
  typia.assert(cartItemB);
  // 4. Customer places order with items from both sellers
  const order =
    await generate_random_shopping_mall_member_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Find order items for each seller
  const orderItemA = order.orderItems.find(
    (item) => item.seller.id === sellerAJoin.id,
  );
  const orderItemB = order.orderItems.find(
    (item) => item.seller.id === sellerBJoin.id,
  );
  TestValidator.predicate("order has item from Seller A", () => !!orderItemA);
  TestValidator.predicate("order has item from Seller B", () => !!orderItemB);
  // 5. Seller A creates shipment for their order item
  const shipmentA =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItemA!.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(16),
        },
      },
    );
  typia.assert(shipmentA);
  // 6. Seller B creates shipment for their order item
  const shipmentB =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerBConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItemB!.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(16),
        },
      },
    );
  typia.assert(shipmentB);
  // 7. Customer creates refund requests for both order items
  const refundRequestA =
    await generate_random_shopping_mall_member_refund_requests_create(
      customerConnection,
      { body: { order_item_id: orderItemA!.id, reason: "Product defective" } },
    );
  typia.assert(refundRequestA);
  const refundRequestB =
    await generate_random_shopping_mall_member_refund_requests_create(
      customerConnection,
      {
        body: { order_item_id: orderItemB!.id, reason: "Wrong item received" },
      },
    );
  typia.assert(refundRequestB);
  // 8. Seller A queries refund requests - should only see their own
  const sellerARefundRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerAConnection,
      { body: {} },
    );
  typia.assert(sellerARefundRequests);
  // 9. Seller B queries refund requests - should only see their own
  const sellerBRefundRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerBConnection,
      { body: {} },
    );
  typia.assert(sellerBRefundRequests);
  // 10. Validate data isolation
  // Seller A should see exactly 1 refund request (for their product)
  TestValidator.equals(
    "Seller A refund request count",
    sellerARefundRequests.data.length,
    1,
  );
  TestValidator.equals(
    "Seller A pagination records",
    sellerARefundRequests.pagination.records,
    1,
  );
  // Seller B should see exactly 1 refund request (for their product)
  TestValidator.equals(
    "Seller B refund request count",
    sellerBRefundRequests.data.length,
    1,
  );
  TestValidator.equals(
    "Seller B pagination records",
    sellerBRefundRequests.pagination.records,
    1,
  );
  // Verify Seller A's refund request is for their product
  const sellerARequest = sellerARefundRequests.data[0];
  TestValidator.equals(
    "Seller A sees correct refund request",
    sellerARequest.id,
    refundRequestA.id,
  );
  TestValidator.equals(
    "Seller A refund request orderItem seller matches",
    sellerARequest.orderItem.seller.id,
    sellerAJoin.id,
  );
  // Verify Seller B's refund request is for their product
  const sellerBRequest = sellerBRefundRequests.data[0];
  TestValidator.equals(
    "Seller B sees correct refund request",
    sellerBRequest.id,
    refundRequestB.id,
  );
  TestValidator.equals(
    "Seller B refund request orderItem seller matches",
    sellerBRequest.orderItem.seller.id,
    sellerBJoin.id,
  );
  // Verify cross-seller isolation - Seller A should NOT see Seller B's request
  const sellerASeesSellerBRequest = sellerARefundRequests.data.some(
    (req) => req.id === refundRequestB.id,
  );
  TestValidator.predicate(
    "Seller A cannot see Seller B's refund request",
    () => !sellerASeesSellerBRequest,
  );
  // Verify cross-seller isolation - Seller B should NOT see Seller A's request
  const sellerBSeesSellerARequest = sellerBRefundRequests.data.some(
    (req) => req.id === refundRequestA.id,
  );
  TestValidator.predicate(
    "Seller B cannot see Seller A's refund request",
    () => !sellerBSeesSellerARequest,
  );
  // Verify member information is included
  TestValidator.predicate(
    "Seller A refund request has member info",
    () => !!sellerARequest.member,
  );
  TestValidator.predicate(
    "Seller B refund request has member info",
    () => !!sellerBRequest.member,
  );
  // Verify orderItem details include product and variant information
  TestValidator.predicate(
    "Seller A refund request has product info",
    () => !!sellerARequest.orderItem.product,
  );
  TestValidator.predicate(
    "Seller A refund request has variant info",
    () => !!sellerARequest.orderItem.productVariant,
  );
  TestValidator.predicate(
    "Seller B refund request has product info",
    () => !!sellerBRequest.orderItem.product,
  );
  TestValidator.predicate(
    "Seller B refund request has variant info",
    () => !!sellerBRequest.orderItem.productVariant,
  );
}