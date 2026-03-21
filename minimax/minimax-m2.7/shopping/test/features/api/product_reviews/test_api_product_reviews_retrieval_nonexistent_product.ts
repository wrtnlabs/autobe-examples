import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving reviews for a non-existent product.
 *
 * According to specifications, when a product does not exist, the system should
 * return an empty result set with status 200 (not 404). This validates that
 * the join with products table properly handles non-existent product IDs.
 *
 * Steps:
 * 1. Generate a random UUID that does not correspond to any existing product
 * 2. Call GET /ecommerceMall/products/{nonExistentProductId}/reviews
 *
 * Validations:
 * - Response status should be 200 (empty result, not error)
 * - Response should include valid pagination metadata structure
 * - Data array should be empty
 * - Pagination records count should be 0
 * - This validates the specification: 'if the product does not exist, return an empty result set'
 */
export async function test_api_product_reviews_retrieval_nonexistent_product(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't correspond to any existing product
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve reviews for a non-existent product
  const response = await api.functional.ecommerceMall.products.reviews.list(
    connection,
    { productId: nonExistentProductId },
  );
  // Validate the response structure using typia.assert()
  typia.assert(response);
  // Validate that data array is empty (non-existent product returns empty results)
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // Validate pagination records count is 0
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  // Validate pagination pages should be 0
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
}
