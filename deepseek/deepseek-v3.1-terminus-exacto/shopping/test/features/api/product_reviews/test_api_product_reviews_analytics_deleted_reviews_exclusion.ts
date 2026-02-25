import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

export async function test_api_product_reviews_analytics_deleted_reviews_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate using direct API call
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerce.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Create product through seller using direct API call with generated category ID
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }).substring(0, 200),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 4,
        }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(), // Generate random category ID
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create multiple customer connections and accounts
  const customerConnections = await ArrayUtil.asyncRepeat(5, async (index) => {
    const conn: api.IConnection = { host: connection.host };
    const customer = await api.functional.ecommerce.auth.customer.join(conn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }).substring(0, 50),
        phone_number: RandomGenerator.mobile(),
      } satisfies IEcommerceCustomer.IJoin,
    });
    typia.assert(customer);
    return { connection: conn, customer };
  });
  // Create reviews with different ratings and timestamps
  const reviews: (IEcommerceReview & IEntity)[] = [];
  const ratings = [5, 4, 3, 2, 1]; // Different ratings for variation
  for (let i = 0; i < customerConnections.length; i++) {
    const review =
      await api.functional.ecommerce.customer.products.reviews.create(
        customerConnections[i].connection,
        {
          productId: product.id,
          body: {
            rating: ratings[i],
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IEcommerceReview.ICreate,
        },
      );
    typia.assert(review);
    reviews.push(review as IEcommerceReview & IEntity);
  }
  // Delete some reviews (delete first and last ones)
  await api.functional.ecommerce.customer.products.reviews.erase(
    customerConnections[0].connection,
    { productId: product.id, reviewId: reviews[0].id },
  );
  await api.functional.ecommerce.customer.products.reviews.erase(
    customerConnections[4].connection,
    { productId: product.id, reviewId: reviews[4].id },
  );
  // Get analytics data
  const analytics =
    await api.functional.ecommerce.analytics.products.reviews.analytics(
      connection,
      { productId: product.id },
    );
  typia.assert(analytics);
  // Verify analytics exclude deleted reviews
  // Should have 3 reviews remaining (5 total - 2 deleted)
  TestValidator.equals("total reviews count", analytics.total_reviews, 3);
  // Verify rating distribution excludes deleted reviews
  // Original ratings: [5, 4, 3, 2, 1], deleted: 5 and 1
  // Remaining ratings: [4, 3, 2]
  // Distribution calculation:
  const remainingRatings = ratings.slice(1, 4); // Exclude first (5) and last (1)
  const expectedDistribution = {
    one_star: remainingRatings.filter((r) => r === 1).length,
    two_stars: remainingRatings.filter((r) => r === 2).length,
    three_stars: remainingRatings.filter((r) => r === 3).length,
    four_stars: remainingRatings.filter((r) => r === 4).length,
    five_stars: remainingRatings.filter((r) => r === 5).length,
  };
  TestValidator.equals(
    "one star count",
    analytics.rating_distribution.one_star,
    expectedDistribution.one_star,
  );
  TestValidator.equals(
    "two stars count",
    analytics.rating_distribution.two_stars,
    expectedDistribution.two_stars,
  );
  TestValidator.equals(
    "three stars count",
    analytics.rating_distribution.three_stars,
    expectedDistribution.three_stars,
  );
  TestValidator.equals(
    "four stars count",
    analytics.rating_distribution.four_stars,
    expectedDistribution.four_stars,
  );
  TestValidator.equals(
    "five stars count",
    analytics.rating_distribution.five_stars,
    expectedDistribution.five_stars,
  );
  // Calculate expected average rating: (4 + 3 + 2) / 3 = 3
  const expectedAverage =
    remainingRatings.reduce((sum, rating) => sum + rating, 0) /
    remainingRatings.length;
  TestValidator.equals(
    "average rating",
    analytics.average_rating,
    expectedAverage,
  );
  // Verify recent trends (all reviews are recent by default)
  TestValidator.equals(
    "recent reviews count",
    analytics.recent_trends.last_30_days,
    3,
  );
  TestValidator.predicate(
    "recent average rating exists",
    analytics.recent_trends.average_rating_last_30_days !== null,
  );
  if (analytics.recent_trends.average_rating_last_30_days !== null) {
    TestValidator.equals(
      "recent average rating",
      analytics.recent_trends.average_rating_last_30_days,
      expectedAverage,
    );
  }
}