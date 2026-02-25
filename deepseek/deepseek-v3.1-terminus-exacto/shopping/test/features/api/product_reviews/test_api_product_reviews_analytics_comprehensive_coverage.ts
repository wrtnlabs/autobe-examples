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

export async function test_api_product_reviews_analytics_comprehensive_coverage(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create product (assuming category exists in test environment)
  const categoryId = typia.random<string & tags.Format<"uuid">>(); // Simulated category
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: categoryId,
      },
    },
  );
  typia.assert(product);
  // 3. Create multiple customers and simulate purchases
  const customers = await ArrayUtil.asyncRepeat(5, async (index) => {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
    return { connection: customerConnection, customer };
  });
  // 4. Create reviews with different ratings (1-5 stars)
  const ratings = [1, 2, 3, 4, 5] as const;
  const reviews = [];
  for (let i = 0; i < 5; i++) {
    const customer = customers[i];
    // Note: In real scenario, customer must have purchased and received product
    // This test assumes the purchase/delivery prerequisites are met
    const review =
      await generate_random_ecommerce_customer_products_reviews_create(
        customer.connection,
        {
          body: {
            rating: ratings[i],
            content: RandomGenerator.paragraph({ sentences: 3 }),
          },
          params: {
            productId: product.id,
          },
        },
      );
    typia.assert(review);
    reviews.push({ rating: ratings[i], review });
  }
  // 5. Fetch analytics using admin connection
  const analyticsResponse =
    await api.functional.ecommerce.analytics.products.reviews.analytics(
      connection,
      { productId: product.id },
    );
  typia.assert(analyticsResponse);
  // 6. Validate analytics calculations
  // Average rating calculation
  const expectedAverage =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  TestValidator.equals(
    "average rating matches created reviews",
    analyticsResponse.average_rating,
    Number(expectedAverage.toFixed(2)),
  );
  // Rating distribution validation
  const ratingCounts = {
    one_star: 0,
    two_stars: 0,
    three_stars: 0,
    four_stars: 0,
    five_stars: 0,
  };
  reviews.forEach((r) => {
    const key = `${r.rating}_star${r.rating > 1 ? "s" : ""}`
      .replace("1_star", "one_star")
      .replace("2_stars", "two_stars")
      .replace("3_stars", "three_stars")
      .replace("4_stars", "four_stars")
      .replace("5_stars", "five_stars");
    ratingCounts[key as keyof typeof ratingCounts] += 1;
  });
  TestValidator.equals(
    "one star count",
    analyticsResponse.rating_distribution.one_star,
    ratingCounts.one_star,
  );
  TestValidator.equals(
    "two stars count",
    analyticsResponse.rating_distribution.two_stars,
    ratingCounts.two_stars,
  );
  TestValidator.equals(
    "three stars count",
    analyticsResponse.rating_distribution.three_stars,
    ratingCounts.three_stars,
  );
  TestValidator.equals(
    "four stars count",
    analyticsResponse.rating_distribution.four_stars,
    ratingCounts.four_stars,
  );
  TestValidator.equals(
    "five stars count",
    analyticsResponse.rating_distribution.five_stars,
    ratingCounts.five_stars,
  );
  // Total reviews count
  TestValidator.equals(
    "total reviews count",
    analyticsResponse.total_reviews,
    reviews.length,
  );
  // Recent trends (all reviews created recently should be in last 30 days)
  TestValidator.equals(
    "recent 30 days count",
    analyticsResponse.recent_trends.last_30_days,
    reviews.length,
  );
  TestValidator.equals(
    "recent 30 days average",
    analyticsResponse.recent_trends.average_rating_last_30_days,
    Number(expectedAverage.toFixed(2)),
  );
  // Helpful votes ratio (null when no votes exist)
  TestValidator.equals(
    "helpful votes ratio without votes",
    analyticsResponse.helpful_votes_ratio,
    null,
  );
}
