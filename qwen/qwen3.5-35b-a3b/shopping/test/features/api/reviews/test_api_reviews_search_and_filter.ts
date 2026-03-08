import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function test_api_reviews_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test advanced search and filtering capabilities for browsing product reviews
  // This test validates rating filters, date range filters, text search, and sorting
  // 1. Test Default Behavior - no filters returns reviews
  const defaultResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default query returns response with pagination",
    () => defaultResponse.pagination !== undefined,
  );
  // 2. Test Rating Filter - 5 stars only
  const fiveStarFilter: IEcommerceMallReview.IRequest = {
    ratingMin: 5,
    ratingMax: 5,
  };
  const fiveStarResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: fiveStarFilter,
    },
  );
  typia.assert(fiveStarResponse);
  TestValidator.predicate("5-star filter returns only 5-star reviews", () =>
    fiveStarResponse.data.every((r) => r.rating === 5),
  );
  // 3. Test Rating Filter - 3 to 4 stars (BETWEEN logic)
  const threeToFourFilter: IEcommerceMallReview.IRequest = {
    ratingMin: 3,
    ratingMax: 4,
  };
  const threeToFourResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: threeToFourFilter,
    },
  );
  typia.assert(threeToFourResponse);
  TestValidator.predicate(
    "3-4 star filter returns only valid ratings (BETWEEN logic)",
    () => threeToFourResponse.data.every((r) => r.rating >= 3 && r.rating <= 4),
  );
  // 4. Test Rating Filter - 1 star only (boundary)
  const oneStarFilter: IEcommerceMallReview.IRequest = {
    ratingMin: 1,
    ratingMax: 1,
  };
  const oneStarResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: oneStarFilter,
    },
  );
  typia.assert(oneStarResponse);
  TestValidator.predicate("1-star filter returns only 1-star reviews", () =>
    oneStarResponse.data.every((r) => r.rating === 1),
  );
  // 5. Test Date Range Filter - createdAtFrom/createdAtTo
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const dateRangeFilter: IEcommerceMallReview.IRequest = {
    createdAtFrom: weekAgo.toISOString(),
    createdAtTo: threeDaysAgo.toISOString(),
  };
  const dateRangeResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: dateRangeFilter,
    },
  );
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range filter returns reviews within range",
    () =>
      dateRangeResponse.data.every(
        (r) =>
          r.createdAt >= weekAgo.toISOString() &&
          r.createdAt <= threeDaysAgo.toISOString(),
      ),
  );
  // 6. Test Combined Filter - Product + Rating
  const productIdFilter: IEcommerceMallReview.IRequest = {
    productId: typia.random<string & tags.Format<"uuid">>(),
    ratingMin: 4,
    ratingMax: 5,
  };
  const combinedResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: productIdFilter,
    },
  );
  typia.assert(combinedResponse);
  TestValidator.predicate("combined filter applies all criteria", () =>
    combinedResponse.data.every(
      (r) =>
        r.product.id === productIdFilter.productId &&
        r.rating >= 4 &&
        r.rating <= 5,
    ),
  );
  // 7. Test Text Search - searchText parameter
  const searchFilter: IEcommerceMallReview.IRequest = {
    searchText: "test",
  };
  const searchResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: searchFilter,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate("text search returns matching reviews", () =>
    searchResponse.data.every(
      (r) => r.textContent !== null && r.textContent.includes("test"),
    ),
  );
  // 8. Test Empty Search Text - returns all reviews without text filter
  const emptySearchFilter: IEcommerceMallReview.IRequest = {
    searchText: "",
  };
  const emptySearchResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: emptySearchFilter,
    },
  );
  typia.assert(emptySearchResponse);
  TestValidator.predicate(
    "empty search returns response",
    () => emptySearchResponse.pagination !== undefined,
  );
  // 9. Test Invalid Date Range (from > to) - should return empty gracefully
  const invalidDateFilter: IEcommerceMallReview.IRequest = {
    createdAtFrom: threeDaysAgo.toISOString(),
    createdAtTo: weekAgo.toISOString(),
  };
  const invalidDateResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: invalidDateFilter,
    },
  );
  typia.assert(invalidDateResponse);
  TestValidator.equals(
    "invalid date range returns empty result",
    invalidDateResponse.data.length,
    0,
  );
  // 10. Test Sorting by Rating (descending - highest first)
  const ratingSortFilter: IEcommerceMallReview.IRequest = {
    sortBy: "rating" as const,
    sortOrder: "desc" as const,
  };
  const ratingSortResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: ratingSortFilter,
    },
  );
  typia.assert(ratingSortResponse);
  TestValidator.predicate("sort by rating desc shows highest first", () => {
    for (let i = 1; i < ratingSortResponse.data.length; i++) {
      if (
        ratingSortResponse.data[i - 1].rating <
        ratingSortResponse.data[i].rating
      ) {
        return false;
      }
    }
    return true;
  });
  // 11. Test Sorting by Created At (ascending - oldest first)
  const dateSortFilter: IEcommerceMallReview.IRequest = {
    sortBy: "createdAt" as const,
    sortOrder: "asc" as const,
  };
  const dateSortResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: dateSortFilter,
    },
  );
  typia.assert(dateSortResponse);
  TestValidator.predicate("sort by createdAt asc shows oldest first", () => {
    for (let i = 1; i < dateSortResponse.data.length; i++) {
      if (
        new Date(dateSortResponse.data[i - 1].createdAt) >
        new Date(dateSortResponse.data[i].createdAt)
      ) {
        return false;
      }
    }
    return true;
  });
  // 12. Test Sorting by Customer ID (groups reviews from same reviewer)
  const customerSortFilter: IEcommerceMallReview.IRequest = {
    sortBy: "customerId" as const,
    sortOrder: "asc" as const,
  };
  const customerSortResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: customerSortFilter,
    },
  );
  typia.assert(customerSortResponse);
  TestValidator.predicate(
    "sort by customerId groups reviews from same reviewer",
    () => {
      const customerIds = customerSortResponse.data.map((r) => r.customer.id);
      for (let i = 1; i < customerIds.length; i++) {
        if (customerIds[i - 1] > customerIds[i]) {
          return false;
        }
      }
      return true;
    },
  );
  // 13. Test Pagination - page and pageSize parameters
  const paginationFilter: IEcommerceMallReview.IRequest = {
    page: 2,
    pageSize: 3,
  };
  const paginationResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: paginationFilter,
    },
  );
  typia.assert(paginationResponse);
  typia.assert(paginationResponse.pagination);
  TestValidator.equals(
    "pagination current page is 2",
    paginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 3",
    paginationResponse.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination returns correct number of records",
    paginationResponse.data.length,
    3,
  );
  // 14. Test Customer ID Filter (admin only)
  const customerFilter: IEcommerceMallReview.IRequest = {
    customerId: typia.random<string & tags.Format<"uuid">>(),
  };
  const customerFilterResponse =
    await api.functional.ecommerceMall.reviews.index(connection, {
      body: customerFilter,
    });
  typia.assert(customerFilterResponse);
  TestValidator.predicate(
    "customer filter returns response",
    () => customerFilterResponse.pagination !== undefined,
  );
  // 15. Test Limit Parameter (alternative to pageSize)
  const limitFilter: IEcommerceMallReview.IRequest = {
    limit: 5,
  };
  const limitResponse = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: limitFilter,
    },
  );
  typia.assert(limitResponse);
  TestValidator.predicate(
    "limit parameter works correctly",
    () => limitResponse.pagination.limit <= 5,
  );
}
