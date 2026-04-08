import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewStatistic";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test seller review statistics retrieval for a specific product.
 *
 * Validates that a seller can retrieve review statistics filtered by a specific product ID. The endpoint returns aggregated statistics including average rating, total count, and rating distribution for reviews associated with the specified product only.
 *
 * This test ensures that the product_id filter correctly filters the reviews table and that statistics are calculated accurately for the filtered subset. The average rating calculation must exclude deleted reviews (deleted_at IS NULL) even when filtering by product_id.
 *
 * 1. Authenticate as seller using join endpoint.
 * 2. Create a product for the seller's shop.
 * 3. Call statistics endpoint with product_id filter.
 * 4. Validate response structure and statistics accuracy.
 */
export async function test_api_seller_review_statistics_product_specific(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product for the seller
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Call statistics endpoint with product_id filter
  const statistics =
    await api.functional.ecommerce.seller.reviews.statistics.search(
      sellerConnection,
      {
        body: {
          product_id: product.id,
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(statistics);
  // 4. Validate response structure
  TestValidator.predicate(
    "average rating in range",
    statistics.average_rating >= 1 && statistics.average_rating <= 5,
  );
  TestValidator.predicate(
    "total count is non-negative",
    statistics.total_count >= 0,
  );
  TestValidator.equals(
    "distribution has 5 keys",
    Object.keys(statistics.distribution).length,
    5,
  );
  // Verify distribution counts sum to total_count
  const distributionSum = Object.values(statistics.distribution).reduce(
    (sum, count) => sum + count,
    0,
  );
  TestValidator.equals(
    "distribution sum equals total count",
    distributionSum,
    statistics.total_count,
  );
  // Verify each distribution key exists and is non-negative
  TestValidator.predicate(
    "distribution key 1 is non-negative",
    statistics.distribution["1"] >= 0,
  );
  TestValidator.predicate(
    "distribution key 2 is non-negative",
    statistics.distribution["2"] >= 0,
  );
  TestValidator.predicate(
    "distribution key 3 is non-negative",
    statistics.distribution["3"] >= 0,
  );
  TestValidator.predicate(
    "distribution key 4 is non-negative",
    statistics.distribution["4"] >= 0,
  );
  TestValidator.predicate(
    "distribution key 5 is non-negative",
    statistics.distribution["5"] >= 0,
  );
}