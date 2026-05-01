import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test review statistics retrieval for a product with zero reviews.
 *
 * Validates that the review statistics endpoint correctly handles the empty
 * state — when a product exists and is owned by the authenticated seller but
 * has never received any customer reviews, the endpoint returns zero values
 * rather than an error response. This confirms the endpoint distinguishes
 * "no reviews yet" from "product not found".
 *
 * 1. Administrator registers and authenticates to manage categories and seller approvals.
 * 2. Seller registers and authenticates — starts in "pending" status.
 * 3. Administrator creates a product category required for product listing.
 * 4. Administrator approves the seller, granting full selling privileges.
 * 5. Seller creates a product with no reviews.
 * 6. Seller retrieves review statistics for the newly created product.
 * 7. Validates averageRating is 0 and totalCount is 0.
 */
export async function test_api_review_statistics_product_no_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup — register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 5. Seller creates a product (no reviews)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 6. Seller retrieves review statistics for the product
  const statistics =
    await api.functional.shoppingMall.seller.products.review_statistics.at(
      sellerConnection,
      { productId: product.id },
    );
  typia.assert(statistics);
  // 7. Validate zero review statistics
  TestValidator.equals(
    "averageRating is 0 for product with no reviews",
    statistics.averageRating,
    0,
  );
  TestValidator.equals(
    "totalCount is 0 for product with no reviews",
    statistics.totalCount,
    0,
  );
}
