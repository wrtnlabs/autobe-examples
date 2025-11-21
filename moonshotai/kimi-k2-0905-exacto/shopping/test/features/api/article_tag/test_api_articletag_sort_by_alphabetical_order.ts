import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleTag";
import type { IShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleTag";

/**
 * Test alphabetical sorting of article tags for systematic browsing and
 * organization.
 *
 * This test validates correct name-based sorting in both ascending and
 * descending order, supporting content managers who need to systematically
 * review tag dictionaries and ensure consistent naming conventions across the
 * platform's article taxonomy.
 *
 * Test steps:
 *
 * 1. Retrieve all article tags to understand the data structure
 * 2. Test ascending alphabetical order sorting (A-Z)
 * 3. Test descending alphabetical order sorting (Z-A)
 * 4. Validate that tags are returned in the correct alphabetical sequence
 * 5. Test pagination with sorting to ensure consistency across pages
 * 6. Verify sorting works with search filters
 */
export async function test_api_articletag_sort_by_alphabetical_order(
  connection: api.IConnection,
) {
  // Step 1: Get initial data to understand what tags exist
  const initialRequest = {
    page: 1,
    limit: 100,
    sortBy: "name" as const,
    sortOrder: "asc" as const,
  } satisfies IShoppingMallArticleTag.IRequest;

  const initialResponse = await api.functional.shoppingMall.articleTags.index(
    connection,
    { body: initialRequest },
  );
  typia.assert(initialResponse);

  TestValidator.predicate(
    "initial response should contain article tags",
    initialResponse.data.length > 0,
  );

  // Step 2: Test ascending alphabetical order (A-Z) with pagination
  const ascendingRequests = [
    { page: 1, limit: 10, sortBy: "name" as const, sortOrder: "asc" as const },
    { page: 2, limit: 10, sortBy: "name" as const, sortOrder: "asc" as const },
  ] satisfies IShoppingMallArticleTag.IRequest[];

  const ascendingResponses = await Promise.all(
    ascendingRequests.map((request) =>
      api.functional.shoppingMall.articleTags.index(connection, {
        body: request,
      }),
    ),
  );

  ascendingResponses.forEach((response) => typia.assert(response));

  // Validate ascending order within each page
  ascendingResponses.forEach((response, pageIndex) => {
    TestValidator.predicate(
      `ascending page ${pageIndex + 1} should have data`,
      response.data.length > 0,
    );

    // Check that items within the page are in ascending order
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `ascending page ${pageIndex + 1} item ${i} should be >= previous item`,
        response.data[i - 1].name.localeCompare(response.data[i].name) <= 0,
      );
    }
  });

  // Step 3: Test descending alphabetical order (Z-A) with pagination
  const descendingRequests = [
    { page: 1, limit: 10, sortBy: "name" as const, sortOrder: "desc" as const },
    { page: 2, limit: 10, sortBy: "name" as const, sortOrder: "desc" as const },
  ] satisfies IShoppingMallArticleTag.IRequest[];

  const descendingResponses = await Promise.all(
    descendingRequests.map((request) =>
      api.functional.shoppingMall.articleTags.index(connection, {
        body: request,
      }),
    ),
  );

  descendingResponses.forEach((response) => typia.assert(response));

  // Validate descending order within each page
  descendingResponses.forEach((response, pageIndex) => {
    TestValidator.predicate(
      `descending page ${pageIndex + 1} should have data`,
      response.data.length > 0,
    );

    // Check that items within the page are in descending order
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `descending page ${pageIndex + 1} item ${i} should be <= previous item`,
        response.data[i - 1].name.localeCompare(response.data[i].name) >= 0,
      );
    }
  });

  // Step 4: Test sorting consistency - ensure first item of page 2 follows last item of page 1
  if (
    ascendingResponses[0].data.length > 0 &&
    ascendingResponses[1].data.length > 0
  ) {
    const lastItemPage1 =
      ascendingResponses[0].data[ascendingResponses[0].data.length - 1];
    const firstItemPage2 = ascendingResponses[1].data[0];

    TestValidator.predicate(
      "ascending sort should be consistent across pages",
      lastItemPage1.name.localeCompare(firstItemPage2.name) <= 0,
    );
  }

  if (
    descendingResponses[0].data.length > 0 &&
    descendingResponses[1].data.length > 0
  ) {
    const lastItemPage1 =
      descendingResponses[0].data[descendingResponses[0].data.length - 1];
    const firstItemPage2 = descendingResponses[1].data[0];

    TestValidator.predicate(
      "descending sort should be consistent across pages",
      lastItemPage1.name.localeCompare(firstItemPage2.name) >= 0,
    );
  }

  // Step 5: Test sorting with search filter
  const searchWithSortRequest = {
    page: 1,
    limit: 20,
    search:
      initialResponse.data.length > 0
        ? initialResponse.data[0].name.substring(0, 3)
        : "a",
    sortBy: "name" as const,
    sortOrder: "asc" as const,
  } satisfies IShoppingMallArticleTag.IRequest;

  const searchWithSortResponse =
    await api.functional.shoppingMall.articleTags.index(connection, {
      body: searchWithSortRequest,
    });
  typia.assert(searchWithSortResponse);

  if (searchWithSortResponse.data.length > 0) {
    // Validate search results are sorted
    for (let i = 1; i < searchWithSortResponse.data.length; i++) {
      TestValidator.predicate(
        "search results should be sorted alphabetically",
        searchWithSortResponse.data[i - 1].name.localeCompare(
          searchWithSortResponse.data[i].name,
        ) <= 0,
      );
    }

    // Validate all results contain the search term
    TestValidator.predicate(
      "search results should contain search term",
      searchWithSortResponse.data.every((tag) =>
        tag.name
          .toLowerCase()
          .includes(searchWithSortRequest.search!.toLowerCase()),
      ),
    );
  }

  // Step 6: Test limit boundaries with sorting
  const limitTests = [1, 5, 50, 100] as const;

  for (const limit of limitTests) {
    const limitRequest = {
      page: 1,
      limit,
      sortBy: "name" as const,
      sortOrder: "asc" as const,
    } satisfies IShoppingMallArticleTag.IRequest;

    const limitResponse = await api.functional.shoppingMall.articleTags.index(
      connection,
      { body: limitRequest },
    );
    typia.assert(limitResponse);

    TestValidator.predicate(
      `limit ${limit} should not exceed requested amount`,
      limitResponse.data.length <= limit,
    );

    // Verify sorting within the limit
    for (let i = 1; i < limitResponse.data.length; i++) {
      TestValidator.predicate(
        `sorting should be correct with limit ${limit}`,
        limitResponse.data[i - 1].name.localeCompare(
          limitResponse.data[i].name,
        ) <= 0,
      );
    }
  }
}
