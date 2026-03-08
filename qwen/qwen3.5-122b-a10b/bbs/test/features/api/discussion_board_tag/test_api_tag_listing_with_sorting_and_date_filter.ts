import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_listing_with_sorting_and_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic tag listing with name sorting (ascending)
  const nameAscResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(nameAscResult);
  // Verify sorting order for name ascending
  for (let i = 1; i < nameAscResult.data.length; i++) {
    TestValidator.predicate(
      "name ascending order",
      nameAscResult.data[i - 1].name <= nameAscResult.data[i].name,
    );
  }
  // Test 2: Date sorting (descending)
  const dateDescResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(dateDescResult);
  // Verify sorting order for created_at descending
  for (let i = 1; i < dateDescResult.data.length; i++) {
    TestValidator.predicate(
      "created_at descending order",
      dateDescResult.data[i - 1].created_at >=
        dateDescResult.data[i].created_at,
    );
  }
  // Test 3: Date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilteredResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        created_at_from: oneWeekAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(dateFilteredResult);
  // Verify all tags are within date range
  for (const tag of dateFilteredResult.data) {
    const tagDate = new Date(tag.created_at);
    TestValidator.predicate(
      "tag within date range",
      tagDate >= oneWeekAgo && tagDate <= now,
    );
  }
  // Test 4: Combined sorting and date filtering
  const combinedResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        created_at_from: oneWeekAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Verify both sorting and date filtering work together
  for (let i = 1; i < combinedResult.data.length; i++) {
    TestValidator.predicate(
      "combined: name ascending order",
      combinedResult.data[i - 1].name <= combinedResult.data[i].name,
    );
    const tagDate = new Date(combinedResult.data[i].created_at);
    TestValidator.predicate(
      "combined: tag within date range",
      tagDate >= oneWeekAgo && tagDate <= now,
    );
  }
  // Test 5: Pagination validation
  const paginatedResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals("page number", paginatedResult.pagination.current, 2);
  TestValidator.equals("limit", paginatedResult.pagination.limit, 5);
  // Test 6: Usage count sorting
  const usageCountResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort_by: "usage_count",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(usageCountResult);
  // Verify usage count sorting
  for (let i = 1; i < usageCountResult.data.length; i++) {
    TestValidator.predicate(
      "usage_count descending order",
      usageCountResult.data[i - 1].article_count >=
        usageCountResult.data[i].article_count,
    );
  }
}
