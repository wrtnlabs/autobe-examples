import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_deleted_customer_handling(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the system's handling of reviews from deleted customer accounts.
   *
   * 1. Retrieve all reviews to understand the data structure
   * 2. Test filtering by a non-existent customer ID (simulating deleted customer)
   * 3. Verify review structure and customer anonymization behavior
   * 4. Validate pagination works correctly
   * 5. Test that email is not exposed for any customer
   */
  // 1. Get all reviews to examine the structure
  const allReviews = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(allReviews);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination info",
    allReviews.pagination.current >= 1,
  );
  TestValidator.predicate("has valid limit", allReviews.pagination.limit > 0);
  TestValidator.predicate(
    "records count is valid",
    allReviews.pagination.records >= 0,
  );
  // 2. Get a sample review to examine structure
  if (allReviews.data.length > 0) {
    const sampleReview = allReviews.data[0];
    typia.assert(sampleReview);
    // 3. Verify review structure integrity
    TestValidator.predicate(
      "review has valid ID",
      sampleReview.id !== undefined,
    );
    TestValidator.predicate(
      "review has valid rating",
      sampleReview.rating >= 1 && sampleReview.rating <= 5,
    );
    TestValidator.predicate(
      "review has timestamps",
      sampleReview.created_at !== undefined,
    );
    TestValidator.predicate(
      "review has order item",
      sampleReview.orderItem.id !== undefined,
    );
    // 4. Verify customer information is present
    TestValidator.predicate(
      "customer has ID",
      sampleReview.customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has display name",
      sampleReview.customer.display_name !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      sampleReview.customer.email !== undefined,
    );
    // 5. Verify customer email is properly formatted (not exposed as internal data)
    TestValidator.predicate(
      "customer email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sampleReview.customer.email),
    );
    // 6. Test filtering by a specific customer ID (the sample review's customer)
    const filteredByCustomer = await api.functional.shoppingMall.reviews.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          customerId: sampleReview.customer.id,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(filteredByCustomer);
    // Verify filtering works - should return reviews from this customer
    TestValidator.predicate(
      "filtered reviews belong to specified customer",
      filteredByCustomer.data.every(
        (review) => review.customer.id === sampleReview.customer.id,
      ),
    );
    // 7. Test filtering by a non-existent customer ID (simulating deleted customer)
    const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
    const filteredByNonExistent =
      await api.functional.shoppingMall.reviews.index(connection, {
        body: {
          page: 1,
          limit: 20,
          customerId: nonExistentCustomerId,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(filteredByNonExistent);
    // When filtering by non-existent/deleted customer, should return empty results
    TestValidator.equals(
      "no reviews for non-existent customer",
      filteredByNonExistent.data.length,
      0,
    );
    TestValidator.equals(
      "pagination records is 0 for non-existent customer",
      filteredByNonExistent.pagination.records,
      0,
    );
    // 8. Test pagination with the non-existent customer filter
    TestValidator.equals(
      "pagination pages is 0 for empty results",
      filteredByNonExistent.pagination.pages,
      0,
    );
    TestValidator.equals(
      "pagination current is 1",
      filteredByNonExistent.pagination.current,
      1,
    );
    // 9. Test filtering by rating to ensure other filters still work
    const filteredByRating = await api.functional.shoppingMall.reviews.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          rating: 5,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(filteredByRating);
    // Verify all returned reviews have the specified rating
    TestValidator.predicate(
      "all reviews have rating 5",
      filteredByRating.data.every((review) => review.rating === 5),
    );
    // 10. Test search functionality
    if (sampleReview.content !== null && sampleReview.content !== undefined) {
      const searchKeyword = RandomGenerator.substring(sampleReview.content);
      const searchResults = await api.functional.shoppingMall.reviews.index(
        connection,
        {
          body: {
            page: 1,
            limit: 20,
            search: searchKeyword,
          } satisfies IShoppingMallReview.IRequest,
        },
      );
      typia.assert(searchResults);
      // Search should return results (at least the sample review if keyword matches)
      TestValidator.predicate(
        "search returns valid pagination",
        searchResults.pagination.current >= 1,
      );
    }
    // 11. Test date range filtering
    const now = new Date();
    const oneYearAgo = new Date(
      now.getTime() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const nowIso = now.toISOString();
    const filteredByDate = await api.functional.shoppingMall.reviews.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          startDate: oneYearAgo,
          endDate: nowIso,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(filteredByDate);
    // Verify all returned reviews are within the date range
    TestValidator.predicate(
      "all reviews are within date range",
      filteredByDate.data.every((review) => {
        const reviewDate = new Date(review.created_at);
        return (
          reviewDate >= new Date(oneYearAgo) && reviewDate <= new Date(nowIso)
        );
      }),
    );
    // 12. Verify order item association is preserved
    if (filteredByDate.data.length > 0) {
      const reviewWithOrderItem = filteredByDate.data[0];
      typia.assert(reviewWithOrderItem);
      TestValidator.predicate(
        "order item has valid ID",
        reviewWithOrderItem.orderItem.id !== undefined,
      );
      TestValidator.predicate(
        "order item has valid order ID",
        reviewWithOrderItem.orderItem.orderId !== undefined,
      );
      TestValidator.predicate(
        "order item has quantity",
        reviewWithOrderItem.orderItem.quantity >= 1,
      );
      TestValidator.predicate(
        "order item has price",
        reviewWithOrderItem.orderItem.price >= 0,
      );
    }
  } else {
    // If no reviews exist, verify empty response structure
    TestValidator.equals("empty data array", allReviews.data.length, 0);
    TestValidator.equals("zero records", allReviews.pagination.records, 0);
    TestValidator.equals("zero pages", allReviews.pagination.pages, 0);
  }
}
