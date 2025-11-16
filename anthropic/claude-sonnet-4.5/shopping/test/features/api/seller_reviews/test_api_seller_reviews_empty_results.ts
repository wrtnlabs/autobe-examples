import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller review retrieval when the seller has no products yet or when
 * products have not received any reviews.
 *
 * This test validates that the review endpoint returns graceful empty responses
 * in two scenarios:
 *
 * 1. New sellers with no products receive empty response with proper pagination
 * 2. Sellers with products but no reviews receive proper empty result handling
 *
 * Test workflow:
 *
 * 1. Register a new seller account via authentication
 * 2. Call review endpoint without creating any products
 * 3. Verify empty data array with pagination showing 0 records and 0 pages
 * 4. Create product sales for the seller but do not create any reviews
 * 5. Call the endpoint again
 * 6. Verify response still returns empty data array since no reviews exist
 * 7. Verify pagination metadata correctly reflects empty result set
 */
export async function test_api_seller_reviews_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Register a new seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    business_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 7,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 2: Test Scenario 1 - New seller with no products
  // Call review endpoint without creating any products
  const emptyReviewsNoProducts: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {} satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(emptyReviewsNoProducts);

  // Step 3: Verify empty response for seller with no products
  TestValidator.equals(
    "reviews data should be empty array for seller with no products",
    emptyReviewsNoProducts.data,
    [],
  );

  TestValidator.equals(
    "pagination current page should be 1",
    emptyReviewsNoProducts.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination records should be 0 for no products",
    emptyReviewsNoProducts.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be 0 for no products",
    emptyReviewsNoProducts.pagination.pages,
    0,
  );

  // Step 4: Create product sales for the seller (but no reviews)
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: categoryId,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
  } satisfies IShoppingMallSale.ICreate;

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: saleData,
    });
  typia.assert(sale);

  // Step 5: Call review endpoint again after creating products
  const emptyReviewsWithProducts: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {} satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(emptyReviewsWithProducts);

  // Step 6: Verify empty response for seller with products but no reviews
  TestValidator.equals(
    "reviews data should be empty array for seller with products but no reviews",
    emptyReviewsWithProducts.data,
    [],
  );

  TestValidator.equals(
    "pagination current page should be 1 for products without reviews",
    emptyReviewsWithProducts.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination records should be 0 for products without reviews",
    emptyReviewsWithProducts.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be 0 for products without reviews",
    emptyReviewsWithProducts.pagination.pages,
    0,
  );

  // Step 7: Additional validation - verify pagination limit is set correctly
  TestValidator.predicate(
    "pagination limit should be positive number",
    emptyReviewsWithProducts.pagination.limit > 0,
  );
}
