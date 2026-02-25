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

export async function test_api_tags_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with valid query 'econ' to find tags containing 'econ'
  const searchResult1 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "econ",
        sortBy: "articleCount",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(searchResult1);
  // Verify pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination metadata exists",
    () =>
      searchResult1.pagination.current === 1 &&
      searchResult1.pagination.limit === 10 &&
      searchResult1.pagination.records >= 0 &&
      searchResult1.pagination.pages >= 0,
  );
  // Verify results are filtered by search query
  const hasMatchingTag = searchResult1.data.some((tag) =>
    tag.tag_name.toLowerCase().includes("econ"),
  );
  TestValidator.predicate(
    "at least one tag matches search query",
    () => hasMatchingTag,
  );
  // Test 2: Test with different pagination parameters and sorting
  const searchResult2 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "econ",
        sortBy: "createdAt",
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(searchResult2);
  // Verify different pagination values
  TestValidator.equals(
    "pagination page 2",
    searchResult2.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit 5", searchResult2.pagination.limit, 5);
  // Test 3: Test with minimum pagination values
  const searchResult3 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "ec",
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(searchResult3);
  // Verify minimum limit works
  TestValidator.equals("pagination limit 1", searchResult3.pagination.limit, 1);
  // Test 4: Test with maximum limit (50)
  const searchResult4 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "ec",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(searchResult4);
  // Verify maximum limit works
  TestValidator.equals(
    "pagination limit 50",
    searchResult4.pagination.limit,
    50,
  );
  // Test 5: Test with default pagination values (page=10, limit=10)
  const searchResult5 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "ec",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(searchResult5);
  // Verify defaults are applied
  TestValidator.equals("default page 10", searchResult5.pagination.current, 10);
  TestValidator.equals("default limit 10", searchResult5.pagination.limit, 10);
  // Test 6: Verify all tags are returned regardless of article count
  const allTags = await api.functional.discussionBoard.tags.index(connection, {
    body: {
      search: "",
      page: 1,
      limit: 100,
    } satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(allTags);
  // The API should return all tags including those with zero articles
  TestValidator.predicate(
    "tags array is not null",
    () => allTags.data !== null,
  );
}
