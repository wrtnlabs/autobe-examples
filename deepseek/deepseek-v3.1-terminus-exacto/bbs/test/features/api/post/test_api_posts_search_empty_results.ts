import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Test post search behavior when no posts match the specified criteria.
 *
 * This test validates that the post search API correctly handles scenarios
 * where no posts match the provided search filters. It tests various edge cases
 * including non-existent keywords, non-existent channels/sections, and
 * contradictory filter combinations to ensure empty results are properly
 * formatted with correct pagination metadata indicating zero matching records.
 */
export async function test_api_posts_search_empty_results(
  connection: api.IConnection,
) {
  // Test 1: Search with non-existent keyword that's unlikely to match any posts
  const searchWithInvalidKeyword = await api.functional.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "xyzinvalidnonexistentkeyword123",
      } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(searchWithInvalidKeyword);

  TestValidator.equals(
    "empty data array for invalid keyword search",
    searchWithInvalidKeyword.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for invalid keyword",
    searchWithInvalidKeyword.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for invalid keyword",
    searchWithInvalidKeyword.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    searchWithInvalidKeyword.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit remains unchanged",
    searchWithInvalidKeyword.pagination.limit,
    10,
  );

  // Test 2: Filter by non-existent channel ID
  const nonExistentChannelId = typia.random<string & tags.Format<"uuid">>();
  const filterByNonExistentChannel = await api.functional.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        discussion_board_channel_id: nonExistentChannelId,
      } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(filterByNonExistentChannel);

  TestValidator.equals(
    "empty data array for non-existent channel",
    filterByNonExistentChannel.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent channel",
    filterByNonExistentChannel.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent channel",
    filterByNonExistentChannel.pagination.pages,
    0,
  );

  // Test 3: Filter by non-existent section ID
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  const filterByNonExistentSection = await api.functional.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        discussion_board_section_id: nonExistentSectionId,
      } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(filterByNonExistentSection);

  TestValidator.equals(
    "empty data array for non-existent section",
    filterByNonExistentSection.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent section",
    filterByNonExistentSection.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent section",
    filterByNonExistentSection.pagination.pages,
    0,
  );

  // Test 4: Apply contradictory filter combinations
  const contradictoryFilters = await api.functional.posts.index(connection, {
    body: {
      page: 1,
      limit: 10,
      is_pinned: true,
      is_locked: true,
      status: "draft",
      created_after: new Date(Date.now() + 86400000).toISOString(),
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(contradictoryFilters);

  TestValidator.equals(
    "empty data array for contradictory filters",
    contradictoryFilters.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for contradictory filters",
    contradictoryFilters.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for contradictory filters",
    contradictoryFilters.pagination.pages,
    0,
  );

  // Test 5: Combine multiple unlikely conditions
  const multipleUnlikelyConditions = await api.functional.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 15,
        search: "veryunlikelysearchterm",
        discussion_board_channel_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        status: "archived",
        is_pinned: false,
        created_before: new Date("2000-01-01").toISOString(),
      } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(multipleUnlikelyConditions);

  TestValidator.equals(
    "empty data array for multiple unlikely conditions",
    multipleUnlikelyConditions.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for multiple unlikely conditions",
    multipleUnlikelyConditions.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for multiple unlikely conditions",
    multipleUnlikelyConditions.pagination.pages,
    0,
  );
}
