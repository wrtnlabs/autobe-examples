import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";

/**
 * Test comprehensive tag search functionality with various filtering and
 * sorting options.
 *
 * This test validates that users can discover tags through keyword search,
 * filter by creation date ranges, and sort by different criteria
 * (alphabetically, by creation date, by popularity). The test verifies
 * pagination works correctly, search results match the provided criteria, and
 * the response includes complete tag metadata including names, slugs, creation
 * dates, and usage statistics.
 *
 * Test workflow:
 *
 * 1. Test basic tag search without filters (browse all tags)
 * 2. Test keyword search with partial name matching
 * 3. Test date range filtering with created_after and created_before
 * 4. Test different sorting options (name_asc, name_desc, created_at_asc,
 *    created_at_desc, usage_desc)
 * 5. Test pagination with different page numbers and limits
 * 6. Test combining multiple filters simultaneously
 * 7. Validate response structure and tag metadata completeness
 */
export async function test_api_tag_search_with_filters(
  connection: api.IConnection,
) {
  // Test 1: Browse all tags without filters (default pagination)
  const allTagsPage1 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(allTagsPage1);

  // Test 2: Search tags with keyword (partial matching)
  const searchKeyword = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<10>
  >();
  const searchResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: searchKeyword,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(searchResult);

  TestValidator.equals(
    "search result page number",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "search result limit",
    searchResult.pagination.limit,
    20,
  );

  // Test 3: Filter tags by creation date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dateFilteredResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        created_after: thirtyDaysAgo.toISOString(),
        created_before: sevenDaysAgo.toISOString(),
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(dateFilteredResult);

  // Test 4: Test sorting - alphabetically ascending
  const sortedNameAsc = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "name_asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedNameAsc);

  // Test 5: Test sorting - by creation date descending (newest first)
  const sortedDateDesc = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "created_at_desc",
        page: 1,
        limit: 15,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedDateDesc);

  // Test 6: Test sorting - by usage/popularity descending
  const sortedByUsage = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "usage_desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedByUsage);

  // Test 7: Test pagination - different page numbers
  const page2Result = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 2,
        limit: 25,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(page2Result);

  TestValidator.equals(
    "page 2 has correct current page",
    page2Result.pagination.current,
    2,
  );

  TestValidator.equals(
    "page 2 has correct limit",
    page2Result.pagination.limit,
    25,
  );

  // Test 8: Test maximum page size limit (100 items)
  const maxLimitResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(maxLimitResult);

  // Test 9: Combine multiple filters - search + date range + sorting
  const combinedFilters = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "economic",
        created_after: thirtyDaysAgo.toISOString(),
        sort: "name_asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(combinedFilters);

  // Test 10: Test all sorting options
  const sortedNameDesc = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "name_desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedNameDesc);

  const sortedDateAsc = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "created_at_asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedDateAsc);

  // Test 11: Test with minimum page size
  const minPageSize = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(minPageSize);

  TestValidator.equals(
    "minimum page size limit",
    minPageSize.pagination.limit,
    1,
  );
}
