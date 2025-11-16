import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostType";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test comprehensive pagination functionality for Reddit post type browsing.
 *
 * This test validates page-based navigation works correctly with varying page
 * sizes and maintains consistency across different result sets. Ensures users
 * can efficiently browse through complete post type catalogs across multiple
 * scenarios:
 *
 * 1. Basic pagination with default parameters
 * 2. Custom page sizes and page navigation
 * 3. Pagination filters applied within available data
 * 4. Adaptive behavior for minimal datasets
 * 5. Large dataset pagination efficiency (when available)
 * 6. Data consistency across paginated results
 *
 * The test is designed to work robustly with any dataset size, from empty to
 * large collections, ensuring reliable pagination behavior for all scenarios.
 *
 * @param connection API connection for making requests
 */
export async function test_api_post_types_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Test basic pagination with default parameters to establish baseline
  const defaultPage = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: {} satisfies IRedditCommunityPostType.IRequest,
    },
  );
  typia.assert(defaultPage);

  // Validate basic pagination structure regardless of data content
  TestValidator.predicate(
    "default pagination has valid structure",
    defaultPage.pagination.current >= 1 &&
      defaultPage.pagination.limit >= 1 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "default page data array respects limit",
    Array.isArray(defaultPage.data) &&
      defaultPage.data.length <= defaultPage.pagination.limit,
  );

  // Step 2: Test with custom small page size - page 1
  const smallPageRequest = {
    page: 1,
    limit: 3,
  } satisfies IRedditCommunityPostType.IRequest;

  const smallPage = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: smallPageRequest,
    },
  );
  typia.assert(smallPage);

  TestValidator.equals(
    "small page has correct limit",
    smallPage.pagination.limit,
    3,
  );
  TestValidator.equals(
    "small page has correct current page",
    smallPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "small page data respects limit",
    smallPage.data.length <= 3,
  );

  // Step 3: Test consistency check - validate data uniqueness when multiple pages exist
  if (smallPage.pagination.pages > 1 && smallPage.pagination.records > 3) {
    const nextPageRequest = {
      page: 2,
      limit: 3,
    } satisfies IRedditCommunityPostType.IRequest;

    const nextPage = await api.functional.redditCommunity.postTypes.index(
      connection,
      {
        body: nextPageRequest,
      },
    );
    typia.assert(nextPage);

    TestValidator.equals(
      "next page has correct page number",
      nextPage.pagination.current,
      2,
    );

    // Verify no overlapping IDs between pages (when data exists)
    const pageIds = new Set(smallPage.data.map((item) => item.id));
    const nextPageIds = nextPage.data.map((item) => item.id);

    TestValidator.predicate(
      "pages have no overlapping IDs",
      !nextPageIds.some((id) => pageIds.has(id)),
    );
  }

  // Step 4: Test maximum page size (if system has data)
  if (defaultPage.pagination.records > 0) {
    const maxPageRequest = {
      page: 1,
      limit: 100,
    } satisfies IRedditCommunityPostType.IRequest;

    const maxPage = await api.functional.redditCommunity.postTypes.index(
      connection,
      {
        body: maxPageRequest,
      },
    );
    typia.assert(maxPage);

    TestValidator.equals(
      "max page has correct limit",
      maxPage.pagination.limit,
      100,
    );
    TestValidator.predicate(
      "max page data respects actual available count",
      maxPage.data.length <= Math.min(100, maxPage.pagination.records),
    );
  }

  // Step 5: Test filtering capabilities (adaptive to available data)
  const filterRequest = {
    page: 1,
    limit: 10,
    allows_text_content: true,
  } satisfies IRedditCommunityPostType.IRequest;

  const filterPage = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: filterRequest,
    },
  );
  typia.assert(filterPage);

  // Validate filter works only when results exist
  if (filterPage.data.length > 0) {
    TestValidator.predicate(
      "filter page respects text content filter",
      filterPage.data.every((item) => item.allows_text_content === true),
    );
  }

  // Step 6: Test search functionality using realistic search terms
  // Use terms that are likely to exist in post type names
  const possibleSearchTerms = ["text", "link", "media", "post", "content"];
  let searchTerm = "post"; // Default fallback

  // Try to find a reasonable search term from actual data
  if (defaultPage.data.length > 0) {
    const sampleNames = defaultPage.data
      .slice(0, 3)
      .map((item) => item.name.toLowerCase());
    const foundTerm = possibleSearchTerms.find((term) =>
      sampleNames.some((name) => name.includes(term)),
    );
    if (foundTerm) searchTerm = foundTerm;
  }

  const searchRequest = {
    page: 1,
    limit: 15,
    search: searchTerm,
  } satisfies IRedditCommunityPostType.IRequest;

  const searchPage = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchPage);

  // Validate search results contain search term (when results exist)
  if (searchPage.data.length > 0) {
    TestValidator.predicate(
      "search results contain search term",
      searchPage.data.every((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }

  // Step 7: Test sorting functionality (name ascending)
  const sortedRequest = {
    page: 1,
    limit: 20,
    order_by: "name",
    order_direction: "asc",
  } satisfies IRedditCommunityPostType.IRequest;

  const sortedPage = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: sortedRequest,
    },
  );
  typia.assert(sortedPage);

  // Validate sorting when sufficient data exists
  if (sortedPage.data.length >= 2) {
    for (let i = 0; i < sortedPage.data.length - 1; i++) {
      TestValidator.predicate(
        "names are sorted ascending",
        sortedPage.data[i].name <= sortedPage.data[i + 1].name,
      );
    }
  }

  // Step 8: Test edge case - requesting page beyond available data
  const overflowPageRequest = {
    page: Math.max(defaultPage.pagination.pages + 1, 9999),
    limit: 10,
  } satisfies IRedditCommunityPostType.IRequest;

  const overflowPage = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: overflowPageRequest,
    },
  );
  typia.assert(overflowPage);

  TestValidator.predicate(
    "overflow page returns empty results",
    overflowPage.data.length === 0,
  );

  // Step 9: Test pagination consistency by requesting same page multiple times
  if (defaultPage.pagination.records > 0) {
    const consistencyRequest = {
      page: 1,
      limit: 5,
    } satisfies IRedditCommunityPostType.IRequest;

    // Request same page twice to verify consistency
    const page1a = await api.functional.redditCommunity.postTypes.index(
      connection,
      {
        body: consistencyRequest,
      },
    );
    typia.assert(page1a);

    const page1b = await api.functional.redditCommunity.postTypes.index(
      connection,
      {
        body: consistencyRequest,
      },
    );
    typia.assert(page1b);

    // Compare consistency where possible
    TestValidator.equals(
      "consistent pagination metadata",
      page1a.pagination,
      page1b.pagination,
    );
    TestValidator.equals(
      "consistent data count",
      page1a.data.length,
      page1b.data.length,
    );

    // Verify specific data consistency for overlapping items
    const minLength = Math.min(page1a.data.length, page1b.data.length);
    for (let i = 0; i < minLength; i++) {
      TestValidator.equals(
        `consistent item ${i} ID`,
        page1a.data[i].id,
        page1b.data[i].id,
      );
    }
  }

  // Step 10: Test combined pagination with multiple parameters
  const combinedRequest = {
    page: 1,
    limit: 8,
    order_by: "name",
    order_direction: "desc",
  } satisfies IRedditCommunityPostType.IRequest;

  const combinedPage = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: combinedRequest,
    },
  );
  typia.assert(combinedPage);

  TestValidator.equals(
    "combined request has correct limit",
    combinedPage.pagination.limit,
    8,
  );

  // Validate combined sorting when data exists
  if (combinedPage.data.length >= 2) {
    for (let i = 0; i < combinedPage.data.length - 1; i++) {
      TestValidator.predicate(
        "names are sorted descending",
        combinedPage.data[i].name >= combinedPage.data[i + 1].name,
      );
    }
  }
}
