import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import type { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_review_review } from "../../../prepare/prepare_random_shopping_mall_review_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test review statistics aggregation with two customer reviews at different ratings.
 *
 * Validates that the review statistics endpoint correctly computes the average rating and total count from multiple non-deleted reviews. Two independent customers each purchase the same product, confirm delivery of their respective shipments, and write reviews with ratings of 3 and 5.
 *
 * The test verifies that the averageRating is 4.0 — the arithmetic mean of 3 and 5 rounded to one decimal place — and that totalCount equals 2, confirming both reviews are counted. This ensures the core aggregation logic (SUM of ratings divided by COUNT, excluding soft-deleted reviews) works correctly across multiple independent purchase and review workflows.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, creates a product under the category, and adds a variant with initial stock.
 * 3. First customer registers and completes the purchase lifecycle:
 *    3.1. Adds the variant to cart and places an order.
 *    3.2. Seller creates a shipment for the order items.
 *    3.3. Customer confirms delivery, transitioning items to "delivered".
 *    3.4. Customer writes a review with rating 3.
 * 4. Second customer registers and completes the same purchase lifecycle:
 *    4.1. Adds the variant to cart and places an order.
 *    4.2. Seller creates a shipment for the order items.
 *    4.3. Customer confirms delivery, transitioning items to "delivered".
 *    4.4. Customer writes a review with rating 5.
 * 5. Query review statistics and assert averageRating is 4.0 and totalCount is 2.
 */
export async function test_api_review_statistics_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 2. Seller setup - register, create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 3. Customer 1 - full purchase lifecycle and review with rating 3
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {});
  await generate_random_shopping_mall_customer_cart_items_create(
    customer1Connection,
    { body: { productVariantId: variant.id, quantity: 1 } },
  );
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customer1Connection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order1);
  const orderItem1 = order1.items[0];
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order1.id },
        body: { orderItemIds: [orderItem1.id] },
      },
    );
  typia.assert(shipment1);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customer1Connection,
    { shipmentId: shipment1.id },
  );
  await generate_random_shopping_mall_customer_reviews_create(
    customer1Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order1.id,
        shopping_mall_order_item_id: orderItem1.id,
        rating: 3,
      },
    },
  );
  // 4. Customer 2 - full purchase lifecycle and review with rating 5
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  await generate_random_shopping_mall_customer_cart_items_create(
    customer2Connection,
    { body: { productVariantId: variant.id, quantity: 1 } },
  );
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customer2Connection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order2);
  const orderItem2 = order2.items[0];
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order2.id },
        body: { orderItemIds: [orderItem2.id] },
      },
    );
  typia.assert(shipment2);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customer2Connection,
    { shipmentId: shipment2.id },
  );
  await generate_random_shopping_mall_customer_reviews_create(
    customer2Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order2.id,
        shopping_mall_order_item_id: orderItem2.id,
        rating: 5,
      },
    },
  );
  // 5. Query review statistics and validate aggregation
  const stats =
    await api.functional.shoppingMall.customer.products.review_statistics.at(
      connection,
      { productId: product.id },
    );
  typia.assert(stats);
  TestValidator.equals("average rating", stats.averageRating, 4.0);
  TestValidator.equals("total count", stats.totalCount, 2);
}
