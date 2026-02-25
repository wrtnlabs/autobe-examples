import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test retrieving review statistics for a product that has no customer reviews yet.
 *
 * This test validates the edge case handling when a product has no reviews,
 * ensuring the statistics endpoint returns a valid structure with appropriate
 * null/zero values rather than an error or missing fields.
 *
 * Setup:
 * 1. Create a seller account via authorize_seller_join utility
 * 2. Create a product via generate_random_shopping_mall_seller_products_create utility
 * 3. Call GET /shoppingMall/products/{productId}/reviews/statistics
 *
 * Expected behavior:
 * - averageRating should be null (no reviews to average)
 * - totalReviewCount should be 0
 * - ratingDistribution should have all keys '1' through '5' with value 0
 */
export async function test_api_product_review_statistics_no_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account for product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product to query statistics for
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // 3. Retrieve review statistics for the product (no reviews exist yet)
  const statistics =
    await api.functional.shoppingMall.products.reviews.statistics(connection, {
      productId: product.id,
    });
  typia.assert(statistics);
  // 4. Validate edge case handling - no reviews scenario
  TestValidator.equals(
    "averageRating should be null when no reviews",
    statistics.averageRating,
    null,
  );
  TestValidator.equals(
    "totalReviewCount should be 0 when no reviews",
    statistics.totalReviewCount,
    0,
  );
  TestValidator.equals(
    "1-star count should be 0",
    statistics.ratingDistribution["1"],
    0,
  );
  TestValidator.equals(
    "2-star count should be 0",
    statistics.ratingDistribution["2"],
    0,
  );
  TestValidator.equals(
    "3-star count should be 0",
    statistics.ratingDistribution["3"],
    0,
  );
  TestValidator.equals(
    "4-star count should be 0",
    statistics.ratingDistribution["4"],
    0,
  );
  TestValidator.equals(
    "5-star count should be 0",
    statistics.ratingDistribution["5"],
    0,
  );
}
