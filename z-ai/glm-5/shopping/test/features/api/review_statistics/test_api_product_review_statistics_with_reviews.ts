import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_customers_me_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_reviews_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_product_review_statistics_with_reviews(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving review statistics for a product with multiple customer reviews
  // across different rating levels (1-5 stars)
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Add inventory to variant
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product has no variants");
  }
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity: 100,
        reason: "Initial test inventory",
      } satisfies IShoppingMallProductInventoryHistory.ICreate,
    },
  );
  // 4. Create multiple customers, place orders, ship, and write reviews
  const reviewRatings = [5, 4, 4, 3, 2];
  const createdReviews: IShoppingMallReview[] = [];
  for (const rating of reviewRatings) {
    // Create customer
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    // Place order
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
    typia.assert(order);
    // Create shipment
    const orderItem = order.orderItems[0];
    if (!orderItem) {
      throw new Error("Order has no items");
    }
    const shipment =
      await generate_random_shopping_mall_seller_sellers_me_shipments_create(
        sellerConnection,
        {
          body: {
            orderItemIds: [orderItem.id],
            carrierName: "TestCarrier",
            trackingNumber: `TRACK-${Date.now()}`,
          } satisfies IShoppingMallOrderShipment.ICreate,
        },
      );
    typia.assert(shipment);
    // Confirm delivery
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
    // Create review
    const review =
      await generate_random_shopping_mall_customer_customers_me_reviews_create(
        customerConnection,
        {
          body: {
            product_id: product.id,
            order_id: order.id,
            rating: rating,
            content: `${rating}-star review for testing`,
          } satisfies IShoppingMallReview.ICreate,
        },
      );
    typia.assert(review);
    createdReviews.push(review);
  }
  // 5. Get review statistics
  const statistics =
    await api.functional.shoppingMall.products.reviews.statistics(connection, {
      productId: product.id,
    });
  typia.assert(statistics);
  // 6. Validate statistics
  // Check total review count
  TestValidator.equals(
    "totalReviewCount",
    statistics.totalReviewCount,
    reviewRatings.length,
  );
  // Check average rating
  const expectedAverage =
    reviewRatings.reduce((sum, r) => sum + r, 0) / reviewRatings.length;
  const roundedExpected = Math.round(expectedAverage * 100) / 100;
  TestValidator.equals(
    "averageRating",
    statistics.averageRating,
    roundedExpected,
  );
  // Check rating distribution
  const expectedDistribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const rating of reviewRatings) {
    const key = rating.toString() as keyof typeof expectedDistribution;
    expectedDistribution[key]++;
  }
  TestValidator.equals(
    "ratingDistribution",
    statistics.ratingDistribution,
    expectedDistribution,
  );
  // Check distribution sum equals total count
  const distributionSum = Object.values(statistics.ratingDistribution).reduce(
    (sum, count) => sum + count,
    0,
  );
  TestValidator.equals(
    "distribution sum equals total count",
    distributionSum,
    statistics.totalReviewCount,
  );
}
