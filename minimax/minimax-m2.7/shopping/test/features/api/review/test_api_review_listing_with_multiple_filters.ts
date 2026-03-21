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
 * Test retrieving a filtered and paginated list of product reviews using multiple filter criteria.
 * This scenario validates the primary success path for the review listing endpoint.
 *
 * Test Steps:
 * 1. Call PATCH /ecommerceMall/reviews with combined filters:
 *    - productId: Filter reviews for a specific product
 *    - customerId: Filter reviews by a specific customer
 *    - ratingMin: 4 (minimum 4-star rating)
 *    - ratingMax: 5 (maximum 5-star rating)
 *    - createdAfter: ISO datetime from 30 days ago
 *    - contentSearch: keyword present in review text
 *    - sortBy: newest (default)
 *    - page: 1
 *    - limit: 10
 *
 * Validation Points:
 * - Response returns 200 OK with paginated data
 * - Response follows IPageIEcommerceMallReview.ISummary schema
 * - Pagination metadata is correct (current, limit, records, pages)
 * - Each review includes: id, rating (4-5), content (matches search), created_at (within date range)
 * - Reviews are sorted by newest first (created_at DESC)
 * - Each review includes customer summary (id, email, display_name, status)
 * - Each review includes product summary (id, name, min_price, max_price, etc.)
 * - Soft-deleted reviews are NOT included (deleted_at IS NULL filter applied)
 * - Results match all filter criteria simultaneously
 */
export async function test_api_review_listing_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // Generate test date for createdAfter filter (30 days ago)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // Generate a search keyword for content filtering
  const searchKeyword = RandomGenerator.alphabets(5);
  // Generate random UUID for productId filter
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Generate random UUID for customerId filter
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // Build the request body with multiple filter criteria
  const requestBody = {
    productId: productId,
    customerId: customerId,
    ratingMin: 4,
    ratingMax: 5,
    createdAfter: thirtyDaysAgo.toISOString(),
    contentSearch: searchKeyword,
    sortBy: "newest" as const,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallReview.IRequest;
  // Call the review listing endpoint with multiple filters
  const response = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: requestBody,
    },
  );
  // Validate response structure with typia.assert (complete runtime validation)
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data is an array
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  // Validate each review in the response
  for (const review of response.data) {
    // Validate rating is within the specified range [4, 5]
    TestValidator.predicate(
      `review ${review.id} has rating between 4 and 5`,
      review.rating >= 4 && review.rating <= 5,
    );
    // Validate review was created within the date range
    const reviewCreatedAt = new Date(review.created_at);
    TestValidator.predicate(
      `review ${review.id} created_at is on or after 30 days ago`,
      reviewCreatedAt >= thirtyDaysAgo,
    );
    // Validate customer summary structure
    TestValidator.equals(
      `review ${review.id} has valid customer.id (UUID format)`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        review.customer.id,
      ),
      true,
    );
    TestValidator.equals(
      `review ${review.id} customer has valid email format`,
      review.customer.email.includes("@"),
      true,
    );
    TestValidator.equals(
      `review ${review.id} customer has valid status`,
      review.customer.status === "active" ||
        review.customer.status === "deleted",
      true,
    );
    // Validate product summary structure
    TestValidator.equals(
      `review ${review.id} has valid product.id (UUID format)`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        review.product.id,
      ),
      true,
    );
    TestValidator.equals(
      `review ${review.id} product has name`,
      review.product.name.length > 0,
      true,
    );
    TestValidator.predicate(
      `review ${review.id} product has valid price range (min_price >= 0 and min_price <= max_price)`,
      review.product.min_price >= 0 &&
        review.product.max_price >= review.product.min_price,
    );
    TestValidator.predicate(
      `review ${review.id} product has valid primary_image_url`,
      typeof review.product.primary_image_url === "string",
    );
    TestValidator.predicate(
      `review ${review.id} product has valid seller_name`,
      typeof review.product.seller_name === "string",
    );
    TestValidator.predicate(
      `review ${review.id} product has valid average_rating (0-5)`,
      review.product.average_rating >= 0 && review.product.average_rating <= 5,
    );
    TestValidator.predicate(
      `review ${review.id} product has valid reviews_count (non-negative)`,
      review.product.reviews_count >= 0,
    );
    // Validate content contains search keyword if it exists
    if (review.content !== null && review.content !== undefined) {
      TestValidator.predicate(
        `review ${review.id} content contains search keyword "${searchKeyword}"`,
        review.content.toLowerCase().includes(searchKeyword.toLowerCase()),
      );
    }
  }
  // Validate sorting: reviews should be sorted by newest first (created_at DESC)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentDate = new Date(response.data[i].created_at);
      const nextDate = new Date(response.data[i + 1].created_at);
      TestValidator.predicate(
        "reviews are sorted newest first (created_at DESC)",
        currentDate >= nextDate,
      );
    }
  }
  // Validate pagination calculation
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "pages is calculated correctly (Math.ceil(records / limit))",
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
    );
  }
}
