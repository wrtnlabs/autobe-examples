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

export async function test_api_review_text_search_and_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  const pool: api.IConnection = { host: connection.host };
  // Step 1: Fetch reviews sorted by newest to establish baseline
  const newestResponse = await api.functional.ecommerceMall.reviews.index(
    pool,
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
        includeDeleted: false,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(newestResponse);
  const allReviews = newestResponse.data;
  if (allReviews.length === 0) {
    // Test with empty dataset - verify pagination structure
    TestValidator.equals(
      "empty result pagination current",
      newestResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      "empty result pagination records",
      newestResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty result pagination pages",
      newestResponse.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty result data length",
      newestResponse.data.length,
      0,
    );
    return;
  }
  // Step 2: Test text search with keyword from existing review
  const reviewWithContent = allReviews.find(
    (r) => r.content !== null && r.content.length > 5,
  );
  if (reviewWithContent && reviewWithContent.content) {
    // Extract a word from the content for search
    const searchKeyword = reviewWithContent.content
      .split(" ")[0]
      .substring(0, 5);
    const searchResponse = await api.functional.ecommerceMall.reviews.index(
      pool,
      {
        body: {
          productId: null,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: null,
          createdBefore: null,
          search: searchKeyword,
          sort: "newest",
          includeDeleted: false,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
    typia.assert(searchResponse);
    // Verify search results contain reviews with the search term
    TestValidator.predicate(
      "search results have valid pagination",
      searchResponse.pagination.records >= 0,
    );
    if (searchResponse.data.length > 0) {
      TestValidator.predicate(
        "search results contain reviews with search term",
        searchResponse.data.some(
          (r) =>
            r.content !== null &&
            r.content.toLowerCase().includes(searchKeyword.toLowerCase()),
        ),
      );
    }
    // Step 5: Test combining search with sort
    const searchAndSortResponse =
      await api.functional.ecommerceMall.reviews.index(pool, {
        body: {
          productId: null,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: null,
          createdBefore: null,
          search: searchKeyword,
          sort: "highestRating",
          includeDeleted: false,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReview.IRequest,
      });
    typia.assert(searchAndSortResponse);
  }
  // Step 4: Test sorting options
  // Test sort by newest (default)
  TestValidator.predicate(
    "newest sort has valid data",
    newestResponse.data.length >= 0,
  );
  if (newestResponse.data.length >= 2) {
    const firstCreated = new Date(newestResponse.data[0].createdAt).getTime();
    const secondCreated = new Date(newestResponse.data[1].createdAt).getTime();
    TestValidator.predicate(
      "newest sort: first review is newer or equal",
      firstCreated >= secondCreated,
    );
  }
  // Test sort by oldest
  const oldestResponse = await api.functional.ecommerceMall.reviews.index(
    pool,
    {
      body: {
        productId: null,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "oldest",
        includeDeleted: false,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(oldestResponse);
  if (oldestResponse.data.length >= 2) {
    const firstCreated = new Date(oldestResponse.data[0].createdAt).getTime();
    const secondCreated = new Date(oldestResponse.data[1].createdAt).getTime();
    TestValidator.predicate(
      "oldest sort: first review is older or equal",
      firstCreated <= secondCreated,
    );
  }
  // Test sort by highestRating
  const highestRatingResponse =
    await api.functional.ecommerceMall.reviews.index(pool, {
      body: {
        productId: null,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "highestRating",
        includeDeleted: false,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(highestRatingResponse);
  if (highestRatingResponse.data.length >= 2) {
    const firstRating = highestRatingResponse.data[0].rating;
    const secondRating = highestRatingResponse.data[1].rating;
    TestValidator.predicate(
      "highestRating sort: ratings descend",
      firstRating >= secondRating,
    );
  }
  // Test sort by lowestRating
  const lowestRatingResponse = await api.functional.ecommerceMall.reviews.index(
    pool,
    {
      body: {
        productId: null,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "lowestRating",
        includeDeleted: false,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(lowestRatingResponse);
  if (lowestRatingResponse.data.length >= 2) {
    const firstRating = lowestRatingResponse.data[0].rating;
    const secondRating = lowestRatingResponse.data[1].rating;
    TestValidator.predicate(
      "lowestRating sort: ratings ascend",
      firstRating <= secondRating,
    );
  }
  // Step 6: Test date range filtering
  if (allReviews.length > 0) {
    const newestReview = allReviews[0];
    const oldestReview = allReviews[allReviews.length - 1];
    const newestDate = new Date(newestReview.createdAt);
    const oldestDate = new Date(oldestReview.createdAt);
    // Test createdAfter filter
    const middleDate = new Date(
      (newestDate.getTime() + oldestDate.getTime()) / 2,
    );
    const dateAfterResponse = await api.functional.ecommerceMall.reviews.index(
      pool,
      {
        body: {
          productId: null,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: middleDate.toISOString(),
          createdBefore: null,
          search: null,
          sort: "newest",
          includeDeleted: false,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
    typia.assert(dateAfterResponse);
    // Verify all returned reviews are after the filter date
    if (dateAfterResponse.data.length > 0) {
      const allAfterFilter = dateAfterResponse.data.every(
        (r) => new Date(r.createdAt).getTime() > middleDate.getTime(),
      );
      TestValidator.predicate(
        "createdAfter filter: all reviews after filter date",
        allAfterFilter,
      );
    }
    // Test createdBefore filter
    const dateBeforeResponse = await api.functional.ecommerceMall.reviews.index(
      pool,
      {
        body: {
          productId: null,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: null,
          createdBefore: middleDate.toISOString(),
          search: null,
          sort: "oldest",
          includeDeleted: false,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
    typia.assert(dateBeforeResponse);
    // Verify all returned reviews are before the filter date
    if (dateBeforeResponse.data.length > 0) {
      const allBeforeFilter = dateBeforeResponse.data.every(
        (r) => new Date(r.createdAt).getTime() < middleDate.getTime(),
      );
      TestValidator.predicate(
        "createdBefore filter: all reviews before filter date",
        allBeforeFilter,
      );
    }
  }
  // Step 7: Test non-matching search returns empty results properly
  const emptySearchResponse = await api.functional.ecommerceMall.reviews.index(
    pool,
    {
      body: {
        productId: null,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: "xyznonexistent12345",
        sort: "newest",
        includeDeleted: false,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search pagination records",
    emptySearchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pagination pages",
    emptySearchResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search data length",
    emptySearchResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search has valid current page",
    emptySearchResponse.pagination.current >= 1,
  );
}
