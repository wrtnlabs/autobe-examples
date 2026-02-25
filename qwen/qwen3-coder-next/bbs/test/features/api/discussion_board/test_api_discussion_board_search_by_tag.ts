import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_search_by_tag(
  connection: api.IConnection,
): Promise<void> {
  // Generate random tag name for testing
  const tagName = "economics-" + RandomGenerator.alphaNumeric(6);
  // Test 1: Search with a specific tag
  const result1 = await api.functional.discussionBoard.search(connection, {
    body: {
      tag: tagName,
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(result1);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination exists",
    result1.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(result1.data));
  // Test 2: Search with multiple tags (if supported by API)
  const result2 = await api.functional.discussionBoard.search(connection, {
    body: {
      tag: tagName,
      page: 1,
      limit: 5,
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(result2);
  // Verify pagination
  TestValidator.equals(
    "pagination records",
    result2.pagination.records,
    result1.pagination.records,
  );
  TestValidator.equals("pagination limit", result2.pagination.limit, 5);
  // Test 3: Search with empty tag (should return all articles)
  const result3 = await api.functional.discussionBoard.search(connection, {
    body: {
      tag: undefined,
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(result3);
  // Test 4: Search with pagination parameters
  const result4 = await api.functional.discussionBoard.search(connection, {
    body: {
      tag: tagName,
      page: 2,
      limit: 3,
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(result4);
  // Verify different page has different data (if enough records exist)
  if (result4.data.length > 0 && result1.data.length > 3) {
    const hasDifferentData = result4.data.some(
      (item1) =>
        !result1.data.slice(0, 3).some((item2) => item1.id === item2.id),
    );
    TestValidator.predicate(
      "different pages have different data",
      hasDifferentData,
    );
  }
  // Test 5: Sort by newest
  const result5 = await api.functional.discussionBoard.search(connection, {
    body: {
      tag: tagName,
      sortBy: "newest",
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(result5);
  // Test 6: Sort by oldest
  const result6 = await api.functional.discussionBoard.search(connection, {
    body: {
      tag: tagName,
      sortBy: "oldest",
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(result6);
  // Test 7: Search with search query
  const result7 = await api.functional.discussionBoard.search(connection, {
    body: {
      q: "test",
      tag: tagName,
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(result7);
  // Test 8: Invalid pagination (edge case)
  const result8 = await api.functional.discussionBoard.search(connection, {
    body: {
      tag: tagName,
      page: 1,
      limit: 100, // Max limit
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(result8);
}
