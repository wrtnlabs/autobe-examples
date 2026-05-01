import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import type { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review_review } from "../../../prepare/prepare_random_shopping_mall_review_review";

/**
 * Test review statistics retrieval for a product with multiple reviews.
 *
 * Validates that the administrator endpoint correctly computes aggregated
 * review statistics for a product that has received reviews from multiple
 * customers. The test creates a product through a seller, has two customers
 * leave reviews with different star ratings, then verifies the computed
 * average rating and total review count.
 *
 * The average rating is expected to be the arithmetic mean of all non-deleted
 * review ratings, rounded to one decimal place. The total count must reflect
 * the exact number of non-deleted reviews.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers and creates a product.
 * 3. First customer registers and writes a review with rating 4.
 * 4. Second customer registers and writes a review with rating 2.
 * 5. Administrator fetches the product's review statistics.
 * 6. Validates averageRating equals 3.0 (rounded to one decimal) and
 *    totalCount equals 2.
 */
export async function test_api_review_statistics_product_with_reviews(
  connection: api.IConnection,
) {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. First customer creates a review
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {});
  const rating1 = 4;
  const review1 = await generate_random_shopping_mall_customer_reviews_create(
    customer1Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        rating: rating1,
      },
    },
  );
  typia.assert(review1);
  // 4. Second customer creates a review
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  const rating2 = 2;
  const review2 = await generate_random_shopping_mall_customer_reviews_create(
    customer2Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        rating: rating2,
      },
    },
  );
  typia.assert(review2);
  // 5. Admin retrieves review statistics
  const stats =
    await api.functional.shoppingMall.admin.products.review_statistics.at(
      adminConnection,
      { productId: product.id },
    );
  typia.assert(stats);
  // 6. Validate statistics
  const expectedAverage = Math.round(((rating1 + rating2) / 2) * 10) / 10;
  TestValidator.equals("average rating", stats.averageRating, expectedAverage);
  TestValidator.equals("total count", stats.totalCount, 2);
}
