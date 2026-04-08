import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving reviews for a product that has no reviews yet.
 *
 * Validates that the review listing endpoint correctly handles the edge case where a product has zero reviews. Ensures the API returns an empty data array with proper pagination metadata (records=0, pages=0) instead of throwing an error. This test verifies graceful handling of products that haven't received any customer feedback yet.
 *
 * 1. Generates a random product UUID representing a product with no reviews.
 * 2. Retrieves reviews for the product with default pagination parameters.
 * 3. Validates response contains empty data array and correct pagination metadata.
 */
export async function test_api_product_review_list_empty_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a product ID (simulating a product with no reviews)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve reviews for product with no reviews
  const reviews = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId,
      body: {},
    },
  );
  typia.assert(reviews);
  // 3. Validate empty review list
  TestValidator.equals("data array is empty", reviews.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    reviews.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    reviews.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", reviews.pagination.pages, 0);
}
