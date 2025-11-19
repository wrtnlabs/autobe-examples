import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardChannel";

/**
 * Test channel status filtering to validate that users can effectively filter
 * channels by operational status. Verify that the filtering API correctly
 * returns channels matching the specified status criteria, and that status
 * filtering works correctly with other search parameters like text search, date
 * ranges, and sorting options.
 */
export async function test_api_discussion_board_channels_status_filtering(
  connection: api.IConnection,
) {
  // Test individual status filtering for each available status
  const statuses = ["active", "inactive", "archived"] as const;

  for (const status of statuses) {
    // Test basic status filtering
    const statusFilterData = {
      page: 1,
      limit: 10,
      status: status,
    } satisfies IDiscussionBoardChannel.IRequest;

    const statusFilteredResult =
      await api.functional.discussionBoard.channels.index(connection, {
        body: statusFilterData,
      });
    typia.assert(statusFilteredResult);

    // Validate API response structure
    TestValidator.predicate(
      `status '${status}' filter should return valid pagination`,
      statusFilteredResult.pagination.current >= 0 &&
        statusFilteredResult.pagination.limit >= 1 &&
        statusFilteredResult.pagination.limit <= 100 &&
        statusFilteredResult.pagination.records >= 0 &&
        statusFilteredResult.pagination.pages >= 0,
    );

    // If there are channels returned, validate they match the filter
    if (statusFilteredResult.data.length > 0) {
      TestValidator.predicate(
        `all returned channels should have status '${status}'`,
        statusFilteredResult.data.every((channel) => channel.status === status),
      );

      // Validate channel structure for returned data
      for (const channel of statusFilteredResult.data) {
        TestValidator.predicate(
          `channel should have valid UUID format`,
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            channel.id,
          ),
        );
        TestValidator.predicate(
          `channel should have non-empty name`,
          channel.name.length > 0,
        );
        TestValidator.predicate(
          `channel should have valid creation date`,
          !isNaN(new Date(channel.created_at).getTime()),
        );
      }
    }
  }

  // Test combined filtering: status + search term
  const searchCombinedData = {
    page: 1,
    limit: 5,
    status: "active",
    search: "discussion",
  } satisfies IDiscussionBoardChannel.IRequest;

  const searchCombinedResult =
    await api.functional.discussionBoard.channels.index(connection, {
      body: searchCombinedData,
    });
  typia.assert(searchCombinedResult);

  // Test combined filtering: status + date range
  const dateRangeData = {
    page: 1,
    limit: 10,
    status: "active",
    created_after: new Date(Date.now() - 86400000 * 30).toISOString(),
    created_before: new Date().toISOString(),
  } satisfies IDiscussionBoardChannel.IRequest;

  const dateRangeResult = await api.functional.discussionBoard.channels.index(
    connection,
    { body: dateRangeData },
  );
  typia.assert(dateRangeResult);

  // Test combined filtering: status + sorting
  const sortingData = {
    page: 1,
    limit: 10,
    status: "active",
    order_by: "name",
    order: "asc",
  } satisfies IDiscussionBoardChannel.IRequest;

  const sortingResult = await api.functional.discussionBoard.channels.index(
    connection,
    { body: sortingData },
  );
  typia.assert(sortingResult);

  // Test default behavior (no status filter specified)
  const defaultData = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardChannel.IRequest;

  const defaultResult = await api.functional.discussionBoard.channels.index(
    connection,
    { body: defaultData },
  );
  typia.assert(defaultResult);

  TestValidator.predicate(
    "default query should return valid pagination structure",
    defaultResult.pagination.current === 1 &&
      defaultResult.pagination.limit === 20 &&
      defaultResult.pagination.records >= 0 &&
      defaultResult.pagination.pages >= 0,
  );

  // Test error handling with invalid parameters
  await TestValidator.error("should handle invalid page number", async () => {
    await api.functional.discussionBoard.channels.index(connection, {
      body: {
        page: 0, // Invalid: minimum is 1
        limit: 10,
      } satisfies IDiscussionBoardChannel.IRequest,
    });
  });

  await TestValidator.error("should handle invalid limit value", async () => {
    await api.functional.discussionBoard.channels.index(connection, {
      body: {
        page: 1,
        limit: 0, // Invalid: minimum is 1
      } satisfies IDiscussionBoardChannel.IRequest,
    });
  });

  // Test pagination behavior
  const paginationTestData = {
    page: 2,
    limit: 5,
    status: "active",
  } satisfies IDiscussionBoardChannel.IRequest;

  const paginationResult = await api.functional.discussionBoard.channels.index(
    connection,
    { body: paginationTestData },
  );
  typia.assert(paginationResult);

  TestValidator.equals(
    "pagination should correctly set page number",
    paginationResult.pagination.current,
    2,
  );
}
