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

export async function test_api_customer_product_review_stats_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 2: Seller joins and creates a test product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product);
  // Step 3: Customer creates reviews with varying ratings (1-5 stars)
  // Create 5 reviews, one for each rating level to ensure all 5 keys exist in distribution
  const reviews: IEcommerceMallReview[] = [];
  for (let i = 0; i < 5; i++) {
    const rating = (i + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>;
    const review = await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          product_id: product.id,
          order_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
    typia.assert(review);
    reviews.push(review);
  }
  // Step 4: Call the review-stats endpoint using customer connection
  const stats =
    await api.functional.ecommerceMall.customer.products.review_stats.getReviewStats(
      customerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(stats);
  // Step 5: Validate response
  TestValidator.equals("review count", stats.totalCount, reviews.length);
  TestValidator.equals(
    "verified purchase count matches total",
    stats.verifiedPurchaseCount,
    reviews.length,
  );
  TestValidator.equals(
    "unverified purchase count is 0",
    stats.unverifiedPurchaseCount,
    0,
  );
  TestValidator.equals(
    "verified + unverified equals total",
    stats.verifiedPurchaseCount + stats.unverifiedPurchaseCount,
    stats.totalCount,
  );
  // Verify all 5 rating distribution keys exist and each has count of 1
  TestValidator.equals(
    "rating distribution has key '1'",
    stats.ratingDistribution["1"],
    1,
  );
  TestValidator.equals(
    "rating distribution has key '2'",
    stats.ratingDistribution["2"],
    1,
  );
  TestValidator.equals(
    "rating distribution has key '3'",
    stats.ratingDistribution["3"],
    1,
  );
  TestValidator.equals(
    "rating distribution has key '4'",
    stats.ratingDistribution["4"],
    1,
  );
  TestValidator.equals(
    "rating distribution has key '5'",
    stats.ratingDistribution["5"],
    1,
  );
  // Verify average rating calculation (weighted mean of 1+2+3+4+5 = 15/5 = 3.0)
  const expectedAverage =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  TestValidator.equals(
    "average rating calculation",
    stats.averageRating,
    expectedAverage,
  );
  // Verify average rating is within valid range
  TestValidator.predicate(
    "average rating in valid range",
    stats.averageRating >= 1.0 && stats.averageRating <= 5.0,
  );
  // Verify timestamps are present
  TestValidator.predicate(
    "oldest review at is valid date-time",
    stats.oldestReviewAt !== null,
  );
  TestValidator.predicate(
    "newest review at is valid date-time",
    stats.newestReviewAt !== null,
  );
  // Verify timestamps are in correct order
  TestValidator.predicate(
    "newest review is after or equal to oldest review",
    new Date(stats.newestReviewAt!).getTime() >=
      new Date(stats.oldestReviewAt!).getTime(),
  );
  // Verify timestamps match actual review dates
  const actualOldest = reviews.reduce((oldest, r) => {
    return new Date(r.created_at).getTime() <
      new Date(oldest.created_at).getTime()
      ? r
      : oldest;
  }, reviews[0]);
  const actualNewest = reviews.reduce((newest, r) => {
    return new Date(r.created_at).getTime() >
      new Date(newest.created_at).getTime()
      ? r
      : newest;
  }, reviews[0]);
  TestValidator.equals(
    "oldest review timestamp matches",
    stats.oldestReviewAt,
    actualOldest.created_at,
  );
  TestValidator.equals(
    "newest review timestamp matches",
    stats.newestReviewAt,
    actualNewest.created_at,
  );
}
