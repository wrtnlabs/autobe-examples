import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Test authenticated customer access to review search functionality. Since
 * review creation APIs are not available, this test focuses on validating the
 * search and filtering capabilities of the review system for authenticated
 * customers. The test verifies that various search parameters work correctly
 * and return properly structured responses.
 */
export async function test_api_review_search_customer_personal_reviews(
  connection: api.IConnection,
) {
  // 1. Create customer account for authenticated search context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Test basic search with required parameters only
  const basicSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(basicSearch);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should exist",
    basicSearch.pagination !== undefined,
  );
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(basicSearch.data),
  );
  TestValidator.equals(
    "current page should be 1",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", basicSearch.pagination.limit, 10);

  // 3. Test search with actor_type filter
  const customerFilterSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "customer",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(customerFilterSearch);

  // 4. Test search with status filters (one at a time since we can't create specific reviews)
  const statuses = ["pending", "approved", "rejected", "flagged"] as const;

  for (const status of statuses) {
    const statusSearch = await api.functional.shoppingMall.reviews.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          status: status,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(statusSearch);

    // If any reviews are returned, validate their status
    for (const review of statusSearch.data) {
      TestValidator.equals(
        `review status should match filter`,
        review.status,
        status,
      );
    }
  }

  // 5. Test search with rating range filters
  const ratingSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        min_rating: 3,
        max_rating: 5,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(ratingSearch);

  // Validate rating range for returned reviews
  for (const review of ratingSearch.data) {
    TestValidator.predicate(
      "rating should be >= min_rating",
      review.overall_rating >= 3,
    );
    TestValidator.predicate(
      "rating should be <= max_rating",
      review.overall_rating <= 5,
    );
  }

  // 6. Test search with sorting parameters
  const sortOptions = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(sortOptions);

  // 7. Test search with text query
  const textSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(textSearch);

  // 8. Test pagination with different page numbers
  const page2Search = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page2Search);
  TestValidator.equals(
    "page 2 should have current page 2",
    page2Search.pagination.current,
    2,
  );

  // 9. Test with different limit values
  const largeLimitSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(largeLimitSearch);
  TestValidator.equals(
    "limit should be 50",
    largeLimitSearch.pagination.limit,
    50,
  );

  // 10. Test combination of multiple filters
  const combinedSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "customer",
        status: "approved",
        min_rating: 4,
        sort_by: "helpful_count",
        order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(combinedSearch);

  // Validate combined filter results
  for (const review of combinedSearch.data) {
    TestValidator.equals(
      "actor type should be customer",
      review.actor_type,
      "customer",
    );
    TestValidator.equals(
      "status should be approved",
      review.status,
      "approved",
    );
    TestValidator.predicate(
      "rating should be >= 4",
      review.overall_rating >= 4,
    );
  }

  // 11. Test empty search (minimal parameters)
  const minimalSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(minimalSearch);
}
