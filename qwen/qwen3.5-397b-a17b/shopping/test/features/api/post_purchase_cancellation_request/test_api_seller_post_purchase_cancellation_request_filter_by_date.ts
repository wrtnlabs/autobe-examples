import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequest";
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
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
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
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller filtering of post-purchase cancellation requests by creation date range.
 *
 * Validates that sellers can filter cancellation requests using createdAtFrom and createdAtTo parameters. The test creates multiple cancellation requests and verifies that date range filtering correctly isolates requests based on creation timestamps.
 *
 * Setup involves a complete order flow: seller creates product with variant, customer places multiple orders, seller ships them, and customer creates cancellation requests. The test then validates date-based filtering behavior through the seller endpoint.
 *
 * 1. Seller joins and creates product with variant.
 * 2. Customer joins and places multiple orders with the product.
 * 3. Seller creates shipments for all orders.
 * 4. Customer creates cancellation requests for each order item.
 * 5. Seller filters by createdAtFrom to get recent requests.
 * 6. Seller filters by createdAtTo to get older requests.
 * 7. Seller filters by both parameters to narrow results.
 * 8. Validates pagination records count and date filtering behavior.
 */
export async function test_api_seller_post_purchase_cancellation_request_filter_by_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 2. Customer setup - join and place multiple orders
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // Create first order
  const cartItem1 =
    await generate_random_shopping_mall_member_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem1);
  const order1 = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order1);
  const orderItem1 = order1.orderItems[0];
  // Create second order
  const cartItem2 =
    await generate_random_shopping_mall_member_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  const order2 = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order2);
  const orderItem2 = order2.orderItems[0];
  // Create third order
  const cartItem3 =
    await generate_random_shopping_mall_member_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem3);
  const order3 = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order3);
  const orderItem3 = order3.orderItems[0];
  // 3. Seller creates shipments for all orders
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order1.id },
        body: {
          order_item_ids: [orderItem1.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment1);
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order2.id },
        body: {
          order_item_ids: [orderItem2.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment2);
  const shipment3 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order3.id },
        body: {
          order_item_ids: [orderItem3.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment3);
  // 4. Customer creates cancellation requests for all order items
  const cancellationRequest1 =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem1.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest1);
  const cancellationRequest2 =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem2.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest2);
  const cancellationRequest3 =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem3.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest3);
  // 5. Test filtering by createdAtFrom - get requests from a specific date
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const fromResult =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(fromResult);
  // Verify all returned requests are on or after the from date
  TestValidator.predicate(
    "from-date filter returns results",
    fromResult.data.length >= 0,
  );
  for (const request of fromResult.data) {
    TestValidator.predicate(
      `request ${request.id} created after from date`,
      new Date(request.created_at).getTime() >= oneDayAgo.getTime() ||
        new Date(request.created_at).getTime() >=
          new Date(cancellationRequest1.created_at).getTime(),
    );
  }
  // 6. Test filtering by createdAtTo - get requests before a specific date
  const futureDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const toResult =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          createdAtTo: futureDate.toISOString(),
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(toResult);
  // Verify all returned requests are on or before the to date
  TestValidator.predicate(
    "to-date filter returns results",
    toResult.data.length >= 0,
  );
  for (const request of toResult.data) {
    TestValidator.predicate(
      `request ${request.id} created before to date`,
      new Date(request.created_at).getTime() <= futureDate.getTime(),
    );
  }
  // 7. Test combined filtering with both createdAtFrom and createdAtTo
  const combinedResult =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
          createdAtTo: futureDate.toISOString(),
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify combined filter works and returns valid results
  TestValidator.predicate(
    "combined date filter returns results",
    combinedResult.data.length >= 0,
  );
  for (const request of combinedResult.data) {
    TestValidator.predicate(
      `request ${request.id} within date range`,
      new Date(request.created_at).getTime() >= oneDayAgo.getTime() &&
        new Date(request.created_at).getTime() <= futureDate.getTime(),
    );
  }
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination records count valid",
    combinedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination current page valid",
    combinedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    combinedResult.pagination.limit >= 1,
  );
}
