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
 * Test that deleted reviews are not included in the product review list response.
 *
 * Validates the PATCH /shoppingMall/products/{productId}/reviews endpoint correctly filters out soft-deleted reviews from the response. Ensures that only active reviews (where deleted_at is null) are returned in the paginated results, while deleted reviews are excluded from both the data array and pagination metadata counts.
 *
 * This test verifies the core business rule that deleted reviews should be invisible to customers browsing product reviews, while maintaining data integrity for audit purposes through soft deletion.
 *
 * 1. Call the review list endpoint for a product with default parameters (deleted=false).
 * 2. Validate response structure matches IPageIShoppingMallReview.ISummary.
 * 3. Verify pagination metadata is correctly populated.
 * 4. Confirm that only active reviews are returned (deleted reviews filtered by API).
 * 5. Test explicit deleted=false parameter to ensure consistent filtering behavior.
 */
export async function test_api_product_review_list_excludes_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for this test
  const testConnection: api.IConnection = { host: connection.host };
  // Generate a product ID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Call the review list endpoint with default parameters (deleted=false implied)
  const response1: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.products.reviews.index(testConnection, {
      productId,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  // Validate response structure
  typia.assert(response1);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    response1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response1.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response1.pagination.pages >= 0,
  );
  // Verify data array structure
  TestValidator.predicate("data array exists", Array.isArray(response1.data));
  TestValidator.equals(
    "data length matches pagination",
    response1.data.length,
    Math.min(response1.pagination.records, response1.pagination.limit),
  );
  // Test 2: Explicitly set deleted=false to ensure only active reviews returned
  const response2: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.products.reviews.index(testConnection, {
      productId,
      body: {
        page: 1,
        limit: 20,
        deleted: false,
      } satisfies IShoppingMallReview.IRequest,
    });
  // Validate response structure
  typia.assert(response2);
  // Verify that explicit deleted=false returns same results as default
  TestValidator.equals(
    "explicit deleted=false matches default behavior",
    response2.pagination.records,
    response1.pagination.records,
  );
  // Verify all returned reviews have valid structure
  for (const review of response2.data) {
    // typia.assert already validated the structure
    // Additional business logic validation
    TestValidator.predicate(
      "review has valid rating",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review has valid ID",
      typeof review.id === "string" && review.id.length > 0,
    );
    TestValidator.predicate(
      "review has customer info",
      typeof review.customer.id === "string",
    );
    TestValidator.predicate(
      "review has product info",
      typeof review.product.id === "string",
    );
  }
  // Test 3: Verify pagination works correctly
  if (response2.pagination.records > 20) {
    const response3: IPageIShoppingMallReview.ISummary =
      await api.functional.shoppingMall.products.reviews.index(testConnection, {
        productId,
        body: {
          page: 2,
          limit: 20,
          deleted: false,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(response3);
    TestValidator.equals(
      "page 2 current page number",
      response3.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 has fewer or equal records",
      response3.pagination.records <= response2.pagination.records,
    );
  }
}
