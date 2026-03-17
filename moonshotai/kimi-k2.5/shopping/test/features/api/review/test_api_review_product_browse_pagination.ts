import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
 * Test browsing reviews for a specific product with default pagination and sorting.
 * Scenario: A customer views a product detail page and wants to see what other customers think about it.
 * The search returns only non-deleted reviews sorted by newest first (default createdAt DESC).
 * Validates the response includes review ID, customer summary (id, email), productId, orderId,
 * rating (1-5), optional content, creation timestamp, and deletedAt status.
 * Ensures pagination metadata is correct with current page, limit, total records, and total pages.
 */
export async function test_api_review_product_browse_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product ID to search reviews for
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Prepare request with product filter and default pagination/sorting
  const body = {
    productId,
    page: null, // Use default page 1
    limit: null, // Use default limit 20
    sortBy: null, // Use default sortBy "createdAt"
    sortOrder: null, // Use default sortOrder "desc"
  } satisfies IEcommerceMallReview.IRequest;
  // Call the reviews endpoint using default pagination
  const response: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.reviews.index(connection, { body });
  // Validate complete response structure with typia
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate each review matches the filter criteria
  for (const review of response.data) {
    // Ensure review is for the requested product
    TestValidator.equals(
      "review productId matches filter",
      review.productId,
      productId,
    );
    // Non-deleted reviews only (public listing excludes soft-deleted reviews)
    TestValidator.equals("review is not deleted", review.deletedAt, null);
    // Rating validation
    TestValidator.predicate(
      "rating is valid (1-5)",
      review.rating >= 1 && review.rating <= 5,
    );
  }
}
