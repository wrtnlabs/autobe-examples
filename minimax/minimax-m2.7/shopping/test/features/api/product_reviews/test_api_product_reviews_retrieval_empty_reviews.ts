import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
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
 * Test retrieving reviews for a product that has no reviews yet.
 * This validates the empty state handling.
 *
 * Steps:
 * 1. Register a seller and create an approved seller account
 * 2. Create a product with the seller
 * 3. Call GET /ecommerceMall/products/{productId}/reviews
 *
 * Validations:
 * - Response status should be 200
 * - Response should include pagination metadata
 * - Data array should be empty (no reviews)
 * - Pagination records count should be 0
 * - Pagination pages count should be 0
 * - Response should still have valid schema structure (pagination + data fields)
 */
export async function test_api_product_reviews_retrieval_empty_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product with the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Retrieve reviews for the product (which should be empty)
  const reviewsResponse =
    await api.functional.ecommerceMall.products.reviews.list(connection, {
      productId: product.id,
    });
  typia.assert(reviewsResponse);
  // 4. Validate the empty state response
  TestValidator.equals("data array should be empty", reviewsResponse.data, []);
  TestValidator.equals(
    "records count should be 0",
    reviewsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    reviewsResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination exists",
    reviewsResponse.pagination !== null,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(reviewsResponse.data),
  );
}
