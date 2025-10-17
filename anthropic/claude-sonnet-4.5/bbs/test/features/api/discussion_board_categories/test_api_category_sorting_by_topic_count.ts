import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test sorting categories by topic_count to identify the most active discussion
 * areas.
 *
 * This test validates that users can discover where community engagement is
 * concentrated by sorting categories based on their activity levels
 * (topic_count). The test covers:
 *
 * 1. Execute PATCH /discussionBoard/categories with sort_by set to topic_count in
 *    descending order
 * 2. Confirm response returns categories ordered from highest to lowest topic
 *    count
 * 3. Validate that the first results represent the most active categories
 * 4. Verify topic_count values are included in response and accurately reflect
 *    category usage
 * 5. Test ascending sort order to find categories with least activity
 * 6. Confirm sorting works correctly in combination with other filters
 * 7. Validate pagination maintains consistent sort order across multiple pages
 */
export async function test_api_category_sorting_by_topic_count(
  connection: api.IConnection,
) {
  // Test 1: Sort by topic_count in descending order (most active first)
  const descendingResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        sort_by: "topic_count",
        sort_direction: "desc",
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(descendingResult);

  // Validate topic_count values are ordered correctly (descending)
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = descendingResult.data[i];
      const next = descendingResult.data[i + 1];

      TestValidator.predicate(
        `categories should be sorted descending by topic_count: ${current.topic_count} >= ${next.topic_count}`,
        current.topic_count >= next.topic_count,
      );
    }
  }

  // Test 2: Sort by topic_count in ascending order (least active first)
  const ascendingResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        sort_by: "topic_count",
        sort_direction: "asc",
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(ascendingResult);

  // Validate topic_count values are ordered correctly (ascending)
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = ascendingResult.data[i];
      const next = ascendingResult.data[i + 1];

      TestValidator.predicate(
        `categories should be sorted ascending by topic_count: ${current.topic_count} <= ${next.topic_count}`,
        current.topic_count <= next.topic_count,
      );
    }
  }

  // Test 3: Verify pagination maintains consistent sort order
  const firstPage: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 5,
        sort_by: "topic_count",
        sort_direction: "desc",
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(firstPage);

  const secondPage: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 2,
        limit: 5,
        sort_by: "topic_count",
        sort_direction: "desc",
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(secondPage);

  // Validate pagination info
  TestValidator.equals(
    "first page number should be 1",
    firstPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "second page number should be 2",
    secondPage.pagination.current,
    2,
  );

  // Validate sort order consistency across pages
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    const lastOfFirstPage = firstPage.data[firstPage.data.length - 1];
    const firstOfSecondPage = secondPage.data[0];

    TestValidator.predicate(
      "topic_count should maintain descending order across pages",
      lastOfFirstPage.topic_count >= firstOfSecondPage.topic_count,
    );
  }

  // Test 4: Sort with additional filters (is_active filter)
  const activeFilteredResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        sort_by: "topic_count",
        sort_direction: "desc",
        is_active: true,
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(activeFilteredResult);

  // Validate all returned categories are active
  if (activeFilteredResult.data.length > 0) {
    for (const category of activeFilteredResult.data) {
      TestValidator.predicate(
        "filtered categories should all be active",
        category.is_active === true,
      );
    }
  }

  // Validate sort order is maintained with filter
  if (activeFilteredResult.data.length > 1) {
    for (let i = 0; i < activeFilteredResult.data.length - 1; i++) {
      const current = activeFilteredResult.data[i];
      const next = activeFilteredResult.data[i + 1];

      TestValidator.predicate(
        "filtered results should maintain descending topic_count order",
        current.topic_count >= next.topic_count,
      );
    }
  }

  // Test 5: Validate default behavior when sort_by is topic_count without explicit direction
  const defaultDirectionResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        sort_by: "topic_count",
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(defaultDirectionResult);

  // According to the spec, topic_count defaults to descending
  if (defaultDirectionResult.data.length > 1) {
    for (let i = 0; i < defaultDirectionResult.data.length - 1; i++) {
      const current = defaultDirectionResult.data[i];
      const next = defaultDirectionResult.data[i + 1];

      TestValidator.predicate(
        "default sort direction for topic_count should be descending",
        current.topic_count >= next.topic_count,
      );
    }
  }
}
