import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReview";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_review_review } from "../../../prepare/prepare_random_shopping_mall_review_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test review listing endpoint filtering by star rating with pagination metadata accuracy.
 *
 * Validates that the product review listing endpoint correctly filters reviews when a
 * rating parameter is provided, and that pagination metadata reflects the filtered count
 * rather than the total review count. This ensures the rating filter operates as a
 * server-side business filter affecting both the returned data and the pagination
 * metadata, not merely a client-side display concern.
 *
 * The test creates two reviews with different ratings (5-star and 3-star) for the same
 * product from two separate orders, then verifies:
 * - Filtering by rating=5 returns only the 5-star review with records=1, pages=1
 * - Querying without the rating filter returns both reviews with records=2
 * - The filtered review's rating matches the requested filter value
 *
 * 1. Seller creates a product with a variant and adds initial stock.
 * 2. Customer places first order, shipment is created and delivery confirmed.
 * 3. Customer writes a 5-star review for the first order.
 * 4. Customer places second order, shipment is created and delivery confirmed.
 * 5. Customer writes a 3-star review for the second order.
 * 6. Review listing is queried with rating=5 filter, validating single result and pagination.
 * 7. Review listing is queried without filter, validating both results and correct total count.
 */
export async function test_api_product_review_list_filter_by_rating(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller creates product, variant, and stock
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock",
      },
    },
  );
  // 2. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. First order → ship → deliver → 5-star review
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order1);
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order1.id },
        body: { orderItemIds: order1.items.map((item) => item.id) },
      },
    );
  typia.assert(shipment1);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipment1.id },
  );
  const review1 = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order1.id,
        shopping_mall_order_item_id: order1.items[0].id,
        rating: 5,
      },
    },
  );
  typia.assert(review1);
  // 4. Second order → ship → deliver → 3-star review
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order2);
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order2.id },
        body: { orderItemIds: order2.items.map((item) => item.id) },
      },
    );
  typia.assert(shipment2);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipment2.id },
  );
  const review2 = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order2.id,
        shopping_mall_order_item_id: order2.items[0].id,
        rating: 3,
      },
    },
  );
  typia.assert(review2);
  // 5. Query reviews with rating=5 filter
  const filteredResult =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        rating: 5,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReviewReview.IRequest,
    });
  typia.assert(filteredResult);
  TestValidator.equals(
    "filtered total records should be 1",
    filteredResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "filtered total pages should be 1",
    filteredResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "filtered data should have 1 review",
    filteredResult.data.length,
    1,
  );
  TestValidator.equals(
    "filtered review should have rating 5",
    filteredResult.data[0].rating,
    5,
  );
  // 6. Query reviews without rating filter
  const allResult = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReviewReview.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.equals(
    "unfiltered total records should be 2",
    allResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "unfiltered data should have 2 reviews",
    allResult.data.length,
    2,
  );
}
