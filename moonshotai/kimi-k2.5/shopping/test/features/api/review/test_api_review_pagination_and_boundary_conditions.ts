import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_pagination_and_boundary_conditions(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies pagination behavior and boundary conditions for review listing.
  // It covers default pagination, maximum limits, navigation, boundary pages, and
  // combined filter scenarios to ensure robust pagination functionality.
  // Step 1: Test default pagination (page=1, limit=20)
  const defaultPage = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        productId: null,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: null, // Use default
        limit: null, // Use default
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(defaultPage);
  // Verify default page number is 1 and default limit is 20
  TestValidator.equals(
    "default page number is 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default limit is 20", defaultPage.pagination.limit, 20);
  TestValidator.predicate("data array exists", Array.isArray(defaultPage.data));
  // Step 2: Test with maximum limit value (100)
  const maxLimitPage = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        productId: null,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "maximum limit is 100",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    maxLimitPage.data.length <= 100,
  );
  // Step 3: Test minimum meaningful page size (limit=1)
  const minLimitPage = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        productId: null,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit: 1,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(minLimitPage);
  TestValidator.equals("minimum limit is 1", minLimitPage.pagination.limit, 1);
  TestValidator.predicate(
    "data length with limit 1",
    minLimitPage.data.length <= 1,
  );
  // Step 4: Test 1-indexed pagination (page 1 should return first results)
  const page1 = await api.functional.ecommerceMall.reviews.index(connection, {
    body: {
      productId: null,
      customerId: null,
      minRating: null,
      maxRating: null,
      createdAfter: null,
      createdBefore: null,
      search: null,
      sort: "newest",
      includeDeleted: null,
      page: 1,
      limit: 10,
    } satisfies IEcommerceMallReview.IRequest,
  });
  typia.assert(page1);
  const page2 = await api.functional.ecommerceMall.reviews.index(connection, {
    body: {
      productId: null,
      customerId: null,
      minRating: null,
      maxRating: null,
      createdAfter: null,
      createdBefore: null,
      search: null,
      sort: "newest",
      includeDeleted: null,
      page: 2,
      limit: 10,
    } satisfies IEcommerceMallReview.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page 1 has current=1", page1.pagination.current, 1);
  TestValidator.equals("page 2 has current=2", page2.pagination.current, 2);
  // If we have enough data, page 1 and page 2 should have different content
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = page1.data.map((r) => r.id);
    const page2Ids = page2.data.map((r) => r.id);
    const hasOverlappingIds = page2Ids.some((id) => page1Ids.includes(id));
    TestValidator.predicate(
      "page 1 and 2 have different content",
      !hasOverlappingIds,
    );
  }
  // Step 5: Test last page behavior (page beyond available data)
  const veryHighPageNumber = 1000; // Assume this is beyond available data
  const lastPage = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        productId: null,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: veryHighPageNumber,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(lastPage);
  // When page is beyond available data, should return empty data array
  // but pagination metadata should still be accurate
  TestValidator.predicate(
    "page beyond bounds returns empty or valid data",
    lastPage.data.length === 0 ||
      lastPage.pagination.current >= lastPage.pagination.pages,
  );
  // Step 6: Test combined filters with pagination
  const year2020 = "2020-01-01T00:00:00.000Z";
  const year2030 = "2030-12-31T23:59:59.999Z";
  const filteredPage = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        productId: null,
        customerId: null,
        minRating: 1,
        maxRating: 5,
        createdAfter: year2020,
        createdBefore: year2030,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(filteredPage);
  // Verify all returned reviews match the filter criteria
  for (const review of filteredPage.data) {
    TestValidator.predicate("rating within min filter", review.rating >= 1);
    TestValidator.predicate("rating within max filter", review.rating <= 5);
    const reviewDate = new Date(review.createdAt);
    const afterDate = new Date(year2020);
    const beforeDate = new Date(year2030);
    TestValidator.predicate("created after filter", reviewDate > afterDate);
    TestValidator.predicate("created before filter", reviewDate < beforeDate);
  }
  // Step 7: Verify pagination metadata is accurate
  // total pages should be ceil(records / limit)
  if (filteredPage.pagination.records > 0) {
    const expectedPages = Math.ceil(
      filteredPage.pagination.records / filteredPage.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation",
      filteredPage.pagination.pages,
      expectedPages,
    );
  }
  // Step 8: Test that pagination respects the provided limit parameter
  const customLimit = 5;
  const customPage = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        productId: null,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit: customLimit,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(customPage);
  TestValidator.equals(
    "custom limit respected",
    customPage.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "data respects custom limit",
    customPage.data.length <= customLimit,
  );
}
