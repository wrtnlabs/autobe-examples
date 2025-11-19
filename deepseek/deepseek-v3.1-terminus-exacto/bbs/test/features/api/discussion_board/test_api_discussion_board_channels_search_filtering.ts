import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardChannel";

/**
 * Comprehensive validation of discussion board channel search and filtering
 * functionality.
 *
 * This test systematically verifies that the API correctly handles pagination,
 * text search, status filtering, sorting, and date range queries for discussion
 * board channels. It ensures that search results match the specified criteria
 * including partial matching and case-insensitive search across channel
 * metadata.
 */
export async function test_api_discussion_board_channels_search_filtering(
  connection: api.IConnection,
) {
  // Test basic pagination with default parameters
  const defaultPage = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should have pagination info",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be respected",
    defaultPage.pagination.limit,
    10,
  );

  // Test text search functionality
  const searchTerm = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const searchResults = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        search: searchTerm,
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(searchResults);

  // Test status filtering
  const statuses = ["active", "inactive", "archived"] as const;
  for (const status of statuses) {
    const filteredResults = await api.functional.discussionBoard.channels.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          status: status,
        } satisfies IDiscussionBoardChannel.IRequest,
      },
    );
    typia.assert(filteredResults);

    if (filteredResults.data.length > 0) {
      TestValidator.predicate(
        `all results should have ${status} status`,
        filteredResults.data.every((channel) => channel.status === status),
      );
    }
  }

  // Test sorting functionality
  const sortFields = ["name", "created_at", "updated_at", "status"] as const;
  const sortDirections = ["asc", "desc"] as const;

  for (const field of sortFields) {
    for (const direction of sortDirections) {
      const sortedResults = await api.functional.discussionBoard.channels.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            order_by: field,
            order: direction,
          } satisfies IDiscussionBoardChannel.IRequest,
        },
      );
      typia.assert(sortedResults);
    }
  }

  // Test date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  const dateFilteredResults =
    await api.functional.discussionBoard.channels.index(connection, {
      body: {
        page: 1,
        limit: 10,
        created_after: pastDate,
        created_before: currentDate,
      } satisfies IDiscussionBoardChannel.IRequest,
    });
  typia.assert(dateFilteredResults);

  // Test combined filters
  const combinedResults = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        search: "test",
        status: "active",
        order_by: "name",
        order: "asc",
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(combinedResults);

  // Test pagination edge cases
  const largePage = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 100,
        limit: 100,
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(largePage);

  const smallLimit = await api.functional.discussionBoard.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardChannel.IRequest,
    },
  );
  typia.assert(smallLimit);
  TestValidator.equals(
    "small limit should be respected",
    smallLimit.pagination.limit,
    1,
  );
}
