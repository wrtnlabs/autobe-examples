import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test retrieving review statistics for a product with no reviews.
 * Validates that the system correctly returns empty statistics (null average,
 * zero total, all rating counts at zero) for newly created products.
 */
export async function test_api_product_review_stats_no_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product using the utility function
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Retrieve review statistics for the newly created product
  const reviewStats =
    await api.functional.shoppingMall.products.review_stats.get(connection, {
      productId: product.id,
    });
  typia.assert(reviewStats);
  // 4. Validate the edge case: product with no reviews
  // averageRating must be null when no reviews exist
  TestValidator.equals(
    "averageRating should be null",
    reviewStats.averageRating,
    null,
  );
  // totalReviews must be 0 when no reviews exist
  TestValidator.equals("totalReviews should be 0", reviewStats.totalReviews, 0);
  // ratingDistribution must have exactly 5 entries, one for each rating 1-5
  TestValidator.equals(
    "ratingDistribution length",
    reviewStats.ratingDistribution.length,
    5,
  );
  // All rating distribution counts must be 0
  TestValidator.predicate(
    "all rating counts are 0",
    reviewStats.ratingDistribution.every((entry) => entry.count === 0),
  );
  // Validate rating distribution structure contains all ratings 1-5
  TestValidator.predicate(
    "rating distribution contains ratings 1-5",
    reviewStats.ratingDistribution
      .map((entry) => entry.rating)
      .sort()
      .join(",") === "1,2,3,4,5",
  );
}
