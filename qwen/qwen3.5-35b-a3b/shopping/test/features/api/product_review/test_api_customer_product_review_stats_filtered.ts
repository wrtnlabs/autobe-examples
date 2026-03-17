import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_customer_product_review_stats_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Create seller and product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test123!@#",
      href: "https://example.com/seller/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 2. Setup - Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test123!@#",
      href: "https://example.com/customer/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create orders for review creation (required by review endpoint)
  // Using generate_random helper that handles order creation
  const orders: IEcommerceMallOrder.ISummary[] = ArrayUtil.repeat(5, () => {
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      order_number: `ORDER-${RandomGenerator.alphaNumeric(8)}`,
      total_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100>
      >(),
      status: "delivered",
      shipping_address: {
        id: typia.random<string & tags.Format<"uuid">>(),
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        street: `${RandomGenerator.alphaNumeric(5)} Test Street`,
        city: "Seoul",
        state: "KR",
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      } as IEcommerceMallAddress.ISummary,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };
  });
  // 4. Create reviews with varied attributes for filtering tests
  // Scenario A - Reviews with ratings 1-5 across different dates
  const baseDate = new Date();
  // Create 5 reviews with ratings 1-5
  await ArrayUtil.asyncForEach([1, 2, 3, 4, 5], async (rating, index) => {
    const reviewDate = new Date(
      baseDate.getTime() - (index + 1) * 24 * 60 * 60 * 1000,
    );
    await api.functional.ecommerceMall.customer.reviews.create(
      customerConnection,
      {
        body: {
          rating,
          title: `Rating ${rating} review`,
          body: RandomGenerator.paragraph({ sentences: 3 }),
          product_id: product.id,
          order_id: orders[index].id,
        },
      },
    );
  });
  // 5. Scenario A - Filter by verified purchase status
  const statsVerified =
    await api.functional.ecommerceMall.customer.products.review_stats.getReviewStats(
      customerConnection,
      {
        productId: product.id,
        body: {
          is_verified_purchase: true,
        },
      },
    );
  typia.assert(statsVerified);
  // All reviews should be verified (is_verified_purchase is always true from review creation)
  TestValidator.equals(
    "verified filter - all reviews verified",
    statsVerified.verifiedPurchaseCount,
    statsVerified.totalCount,
  );
  // 6. Scenario B - Filter by rating range (4-5 stars)
  const statsRatingRange =
    await api.functional.ecommerceMall.customer.products.review_stats.getReviewStats(
      customerConnection,
      {
        productId: product.id,
        body: {
          rating_min: 4,
          rating_max: 5,
        },
      },
    );
  typia.assert(statsRatingRange);
  // Should only count 2 reviews (ratings 4 and 5)
  TestValidator.equals(
    "rating range filter - correct count",
    statsRatingRange.totalCount,
    2,
  );
  // Verify rating distribution only has counts for 4 and 5
  TestValidator.equals(
    "rating range filter - rating 1 count is 0",
    statsRatingRange.ratingDistribution["1"],
    0,
  );
  TestValidator.equals(
    "rating range filter - rating 2 count is 0",
    statsRatingRange.ratingDistribution["2"],
    0,
  );
  TestValidator.equals(
    "rating range filter - rating 3 count is 0",
    statsRatingRange.ratingDistribution["3"],
    0,
  );
  TestValidator.equals(
    "rating range filter - rating 4 count is 1",
    statsRatingRange.ratingDistribution["4"],
    1,
  );
  TestValidator.equals(
    "rating range filter - rating 5 count is 1",
    statsRatingRange.ratingDistribution["5"],
    1,
  );
  // 7. Scenario C - Filter by date range
  // Use middle 3 days out of 5 (days 2-4)
  const statsDateRange =
    await api.functional.ecommerceMall.customer.products.review_stats.getReviewStats(
      customerConnection,
      {
        productId: product.id,
        body: {
          created_at_after: new Date(
            baseDate.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_before: new Date(
            baseDate.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(statsDateRange);
  TestValidator.equals(
    "date range filter - correct count",
    statsDateRange.totalCount,
    4,
  );
  // 8. Scenario D - Empty result set (impossible filter)
  const statsEmpty =
    await api.functional.ecommerceMall.customer.products.review_stats.getReviewStats(
      customerConnection,
      {
        productId: product.id,
        body: {
          rating_min: 6, // Impossible - max is 5
        },
      },
    );
  typia.assert(statsEmpty);
  // Empty result should have zero counts and all distribution values are 0
  TestValidator.equals(
    "empty result - totalCount is 0",
    statsEmpty.totalCount,
    0,
  );
  TestValidator.equals(
    "empty result - rating 1 count is 0",
    statsEmpty.ratingDistribution["1"],
    0,
  );
  TestValidator.equals(
    "empty result - rating 2 count is 0",
    statsEmpty.ratingDistribution["2"],
    0,
  );
  TestValidator.equals(
    "empty result - rating 3 count is 0",
    statsEmpty.ratingDistribution["3"],
    0,
  );
  TestValidator.equals(
    "empty result - rating 4 count is 0",
    statsEmpty.ratingDistribution["4"],
    0,
  );
  TestValidator.equals(
    "empty result - rating 5 count is 0",
    statsEmpty.ratingDistribution["5"],
    0,
  );
  TestValidator.equals(
    "empty result - verified purchase count is 0",
    statsEmpty.verifiedPurchaseCount,
    0,
  );
  TestValidator.equals(
    "empty result - unverified purchase count is 0",
    statsEmpty.unverifiedPurchaseCount,
    0,
  );
  // oldestReviewAt and newestReviewAt should be null for empty set
  TestValidator.equals(
    "empty result - oldestReviewAt is null",
    statsEmpty.oldestReviewAt,
    null,
  );
  TestValidator.equals(
    "empty result - newestReviewAt is null",
    statsEmpty.newestReviewAt,
    null,
  );
}
