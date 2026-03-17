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

export async function test_api_product_reviews_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Generate a product ID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: startDate filter only - reviews created on or after 30 days ago
  const startDate30DaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const result1 = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        startDate: startDate30DaysAgo,
        page: 1,
        pageSize: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(result1);
  TestValidator.equals(
    "startDate filter returns paginated response",
    result1.pagination.current,
    1,
  );
  // Test 2: endDate filter only - reviews created on or before 10 days ago
  const endDate10DaysAgo = new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const result2 = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        endDate: endDate10DaysAgo,
        page: 1,
        pageSize: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(result2);
  TestValidator.equals(
    "endDate filter returns paginated response",
    result2.pagination.current,
    1,
  );
  // Test 3: Combined startDate and endDate - date range query
  const result3 = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        startDate: startDate30DaysAgo,
        endDate: endDate10DaysAgo,
        page: 1,
        pageSize: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(result3);
  TestValidator.equals(
    "combined date range filter returns paginated response",
    result3.pagination.current,
    1,
  );
  // Test 4: Pagination with date filters - page 2
  const result4 = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        startDate: startDate30DaysAgo,
        endDate: endDate10DaysAgo,
        page: 2,
        pageSize: 10,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(result4);
  TestValidator.equals(
    "pagination page 2 with date filters",
    result4.pagination.current,
    2,
  );
  // Test 5: Default sorting (created_at desc) with date filters
  const result5 = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        startDate: startDate30DaysAgo,
        endDate: endDate10DaysAgo,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(result5);
  TestValidator.predicate(
    "default sorting returns reviews array",
    Array.isArray(result5.data),
  );
  // Test 6: Ascending sort with date filters
  const result6 = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        startDate: startDate30DaysAgo,
        endDate: endDate10DaysAgo,
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(result6);
  TestValidator.predicate(
    "ascending sort with date filters returns reviews array",
    Array.isArray(result6.data),
  );
  // Test 7: Alternative sort by rating with date filters
  const result7 = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        startDate: startDate30DaysAgo,
        endDate: endDate10DaysAgo,
        sortBy: "rating",
        sortOrder: "desc",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(result7);
  TestValidator.predicate(
    "rating sort with date filters returns reviews array",
    Array.isArray(result7.data),
  );
  // Test 8: Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current is positive integer",
    result3.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative integer",
    result3.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    result3.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative integer",
    result3.pagination.pages >= 0,
  );
  // Test 9: Verify review summary structure
  if (result3.data.length > 0) {
    const firstReview = result3.data[0];
    TestValidator.predicate(
      "review has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstReview.id,
      ),
    );
    TestValidator.predicate(
      "review rating is between 1 and 5",
      firstReview.rating >= 1 && firstReview.rating <= 5,
    );
    TestValidator.predicate(
      "review createdAt is ISO 8601 format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstReview.createdAt,
      ),
    );
    TestValidator.predicate(
      "review author has valid email",
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
        firstReview.author.email,
      ),
    );
  }
  // Test 10: Empty date range (endDate before startDate) - should still work
  const futureDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const result10 = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        startDate: futureDate,
        endDate: startDate30DaysAgo,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(result10);
  TestValidator.predicate(
    "empty date range returns valid pagination",
    result10.pagination.current >= 1,
  );
}
