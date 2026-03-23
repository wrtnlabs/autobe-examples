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

/**
 * Test the primary success path for browsing product reviews with pagination.
 *
 * This test validates:
 * 1. Default pagination behavior (page=1, limit=20)
 * 2. Response structure with pagination metadata and review summaries
 * 3. Review sorting by creation date (newest first)
 * 4. Pagination navigation to subsequent pages
 * 5. Exclusion of soft-deleted reviews
 * 6. Edge cases (empty results, last page)
 */
export async function test_api_review_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the review listing endpoint
  const reviewConnection: api.IConnection = { host: connection.host };
  // Test 1: Retrieve first page with default parameters
  const firstPage = await api.functional.shoppingMall.reviews.index(
    reviewConnection,
    {
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.predicate(
    "first page current should be 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "first page limit should be default 20",
    firstPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Validate review summaries structure
  for (const review of firstPage.data) {
    // Verify required fields exist
    TestValidator.predicate(
      `review ${review.id} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        review.id,
      ),
    );
    TestValidator.predicate(
      `review ${review.id} has valid rating (1-5)`,
      review.rating >= 1 && review.rating <= 5,
    );
    // Verify customer info
    TestValidator.predicate(
      `review ${review.id} has customer with valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        review.customer.id,
      ),
    );
    TestValidator.predicate(
      `review ${review.id} has customer with valid email`,
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
        review.customer.email,
      ),
    );
    // Verify order item info
    TestValidator.predicate(
      `review ${review.id} has order item with valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        review.orderItem.id,
      ),
    );
    // Verify timestamps exist
    TestValidator.predicate(
      `review ${review.id} has created_at`,
      review.created_at !== undefined,
    );
    TestValidator.predicate(
      `review ${review.id} has updated_at`,
      review.updated_at !== undefined,
    );
    // Verify soft-deleted reviews are excluded (deleted_at should be null)
    TestValidator.equals(
      `review ${review.id} should not be deleted`,
      review.deleted_at,
      null,
    );
  }
  // Test 2: Verify sorting by created_at (newest first)
  if (firstPage.data.length > 1) {
    for (let i = 1; i < firstPage.data.length; i++) {
      TestValidator.predicate(
        `review ${i} should be older or same as review ${i - 1}`,
        new Date(firstPage.data[i].created_at).getTime() <=
          new Date(firstPage.data[i - 1].created_at).getTime(),
      );
    }
  }
  // Test 3: Pagination - request page 2 with limit 10
  if (firstPage.pagination.pages >= 2) {
    const secondPage = await api.functional.shoppingMall.reviews.index(
      reviewConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(secondPage);
    // Validate pagination metadata
    TestValidator.equals(
      "second page current should be 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit should be 10",
      secondPage.pagination.limit,
      10,
    );
    // Verify no duplicate reviews between pages
    const firstPageIds = new Set(firstPage.data.map((r) => r.id));
    const hasDuplicates = secondPage.data.some((r) => firstPageIds.has(r.id));
    TestValidator.predicate(
      "second page should not contain reviews from first page",
      !hasDuplicates,
    );
  }
  // Test 4: Test with custom limit (edge case: limit = 1)
  const singleItemPage = await api.functional.shoppingMall.reviews.index(
    reviewConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(singleItemPage);
  TestValidator.equals(
    "single item page should have at most 1 review",
    singleItemPage.data.length,
    singleItemPage.pagination.records > 0 ? 1 : 0,
  );
  TestValidator.equals(
    "single item page limit should be 1",
    singleItemPage.pagination.limit,
    1,
  );
  // Test 5: Test with rating filter
  const fiveStarReviews = await api.functional.shoppingMall.reviews.index(
    reviewConnection,
    {
      body: {
        page: 1,
        limit: 10,
        rating: 5,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(fiveStarReviews);
  // Verify all returned reviews have rating 5
  for (const review of fiveStarReviews.data) {
    TestValidator.equals(
      `filtered review ${review.id} should have rating 5`,
      review.rating,
      5,
    );
  }
  // Test 6: Test empty result set (using a filter that likely returns no results)
  const emptyPage = await api.functional.shoppingMall.reviews.index(
    reviewConnection,
    {
      body: {
        page: 9999,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page should have 0 reviews",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty page current should be 9999",
    emptyPage.pagination.current,
    9999,
  );
}
