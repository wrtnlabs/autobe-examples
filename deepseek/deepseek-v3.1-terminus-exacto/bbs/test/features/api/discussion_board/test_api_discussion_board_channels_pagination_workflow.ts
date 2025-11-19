import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardChannel";

/**
 * Test pagination functionality for channel browsing.
 *
 * This test validates the complete pagination workflow for discussion board
 * channels, including navigation through multiple pages, page size variations,
 * sorting options, and metadata accuracy. It ensures that users can efficiently
 * browse through large result sets with proper pagination controls and accurate
 * record tracking.
 */
export async function test_api_discussion_board_channels_pagination_workflow(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination with default settings
  const firstPage = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(firstPage);

  TestValidator.predicate(
    "first page should have valid pagination metadata",
    firstPage.pagination.current === 1 &&
      firstPage.pagination.limit === 10 &&
      firstPage.pagination.records >= 0 &&
      firstPage.pagination.pages >= 0,
  );

  // Test 2: Different page sizes
  const smallPage = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(smallPage);

  const largePage = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(largePage);

  TestValidator.predicate(
    "different page sizes should have correct limits",
    smallPage.pagination.limit === 5 && largePage.pagination.limit === 20,
  );

  // Test 3: Multiple page navigation
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.discussionBoard.channels.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardChannel.IRequest,
      },
    );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page should have correct current page",
      secondPage.pagination.current,
      2,
    );

    TestValidator.predicate(
      "total records should be consistent across pages",
      firstPage.pagination.records === secondPage.pagination.records,
    );
  }

  // Test 4: Sorting functionality
  const sortedByNameAsc = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "name",
        order: "asc",
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(sortedByNameAsc);

  const sortedByNameDesc = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "name",
        order: "desc",
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(sortedByNameDesc);

  // Validate sorting by checking first two items if available
  if (sortedByNameAsc.data.length >= 2) {
    const firstItem = sortedByNameAsc.data[0];
    const secondItem = sortedByNameAsc.data[1];

    TestValidator.predicate(
      "ascending sort should order names correctly",
      firstItem.name.localeCompare(secondItem.name) <= 0,
    );
  }

  if (sortedByNameDesc.data.length >= 2) {
    const firstItem = sortedByNameDesc.data[0];
    const secondItem = sortedByNameDesc.data[1];

    TestValidator.predicate(
      "descending sort should order names correctly",
      firstItem.name.localeCompare(secondItem.name) >= 0,
    );
  }

  // Test 5: Maximum page limit
  const maxLimitPage = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "maximum limit should be respected",
    maxLimitPage.pagination.limit,
    100,
  );

  // Test 6: Search and filtering with pagination
  const searchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 5,
  });
  const searchedPage = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(searchedPage);

  // Test 7: Status filtering with pagination
  const activeChannels = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "active",
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(activeChannels);

  // Test 8: Date range filtering with pagination
  const recentChannels = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        created_after: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(recentChannels);

  // Test 9: Pagination boundary test
  if (firstPage.pagination.pages > 0) {
    const lastPage = await api.functional.discussionBoard.channels.index(
      connection,
      {
        body: {
          page: firstPage.pagination.pages,
          limit: 10,
        } satisfies IDiscussionBoardChannel.IRequest,
      },
    );
    typia.assert(lastPage);

    TestValidator.equals(
      "last page should have correct page number",
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
  }

  // Test 10: Error handling for out-of-bounds page
  if (firstPage.pagination.pages > 0) {
    const beyondPage = await api.functional.discussionBoard.channels.index(
      connection,
      {
        body: {
          page: firstPage.pagination.pages + 1,
          limit: 10,
        } satisfies IDiscussionBoardChannel.IRequest,
      },
    );
    typia.assert(beyondPage);

    TestValidator.predicate(
      "page beyond total pages should return empty or valid data",
      beyondPage.data.length === 0 ||
        beyondPage.pagination.current === firstPage.pagination.pages + 1,
    );
  }

  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination should have valid mathematical relationships",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit) ||
      firstPage.pagination.records === 0,
  );

  TestValidator.predicate(
    "current page should not exceed total pages",
    firstPage.pagination.current <= firstPage.pagination.pages ||
      firstPage.pagination.pages === 0,
  );
}
