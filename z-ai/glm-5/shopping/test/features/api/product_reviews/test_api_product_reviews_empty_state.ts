import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test behavior when retrieving reviews for a product that has no reviews.
 *
 * This test verifies that the reviews API correctly handles the empty state
 * by returning a properly structured paginated response with zero records,
 * rather than throwing an error or returning null.
 *
 * @param connection - API connection
 */
export async function test_api_product_reviews_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product UUID that doesn't have any reviews
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Fetch reviews for the product with no reviews
  const reviews = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId,
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(reviews);
  // Validate empty data array
  TestValidator.equals("reviews data should be empty", reviews.data, []);
  // Validate pagination metadata reflects zero records
  TestValidator.equals(
    "current page should be 1",
    reviews.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default 10",
    reviews.pagination.limit,
    10,
  );
  TestValidator.equals("records should be 0", reviews.pagination.records, 0);
  TestValidator.equals("pages should be 0", reviews.pagination.pages, 0);
  // Validate response structure is consistent with non-empty responses
  TestValidator.predicate(
    "pagination object exists",
    reviews.pagination !== null,
  );
  TestValidator.predicate("data array exists", Array.isArray(reviews.data));
}
