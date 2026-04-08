import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test approved seller successfully retrieves review statistics for their newly
 * created product that has no reviews yet. Validates that the review-stats endpoint
 * returns appropriate default values (zero counts and average rating) for a product
 * with no review history.
 */
export async function test_api_product_review_stats_retrieval_new_product(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller to obtain JWT tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create a product owned by the authenticated seller
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          basePrice: typia.random<
            number & tags.Type<"float"> & tags.Minimum<0>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 3: Retrieve review statistics for the newly created product
  const reviewStats: IEcommerceMallProductReviewStat =
    await api.functional.ecommerceMall.seller.products.review_stats.reviewStats(
      sellerConnection,
      { productId: product.id },
    );
  typia.assert(reviewStats);
  // Step 4: Validate review statistics for a new product with no reviews
  TestValidator.equals(
    "average rating for new product",
    reviewStats.averageRating,
    0,
  );
  TestValidator.equals(
    "total review count for new product",
    reviewStats.totalCount,
    0,
  );
  TestValidator.equals(
    "distribution 1-star count",
    reviewStats.distribution["1"],
    0,
  );
  TestValidator.equals(
    "distribution 2-star count",
    reviewStats.distribution["2"],
    0,
  );
  TestValidator.equals(
    "distribution 3-star count",
    reviewStats.distribution["3"],
    0,
  );
  TestValidator.equals(
    "distribution 4-star count",
    reviewStats.distribution["4"],
    0,
  );
  TestValidator.equals(
    "distribution 5-star count",
    reviewStats.distribution["5"],
    0,
  );
}
