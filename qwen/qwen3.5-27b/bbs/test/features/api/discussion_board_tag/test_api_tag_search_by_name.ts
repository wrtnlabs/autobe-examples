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

/**
 * Test searching for tags using partial name matching.
 *
 * This test validates the tag search functionality by submitting various
 * search queries and verifying that only tags containing the search term
 * in their name are returned. Tests case-insensitive matching, pagination
 * integration, sort order validation, and empty result handling.
 */
export async function test_api_tag_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Search with a common keyword
  const searchKeyword = RandomGenerator.alphabets(4);
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
  // Validate that all returned tags contain the search keyword
  for (const tag of searchResult.data) {
    TestValidator.predicate(
      `tag name "${tag.name}" contains search keyword "${searchKeyword}"`,
      tag.name.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
  }
  // 2. Test case-insensitive search
  const upperCaseSearch = searchKeyword.toUpperCase();
  const caseInsensitiveResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: upperCaseSearch,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(caseInsensitiveResult);
  // Verify case-insensitive matching returns same count
  TestValidator.equals(
    "case-insensitive search returns same count",
    caseInsensitiveResult.data.length,
    searchResult.data.length,
  );
  // 3. Test search with pagination
  const paginatedResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: searchKeyword,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginatedResult.pagination.pages >= 0,
  );
  // 4. Test search with sorting by name
  const sortedByNameResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: searchKeyword,
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedByNameResult);
  // Validate ascending sort order by name
  for (let i = 1; i < sortedByNameResult.data.length; i++) {
    TestValidator.predicate(
      `tags are sorted alphabetically: "${sortedByNameResult.data[i - 1].name}" <= "${sortedByNameResult.data[i].name}"`,
      sortedByNameResult.data[i - 1].name.localeCompare(
        sortedByNameResult.data[i].name,
      ) <= 0,
    );
  }
  // 5. Test empty search results
  const uniqueKeyword = `unique_${RandomGenerator.alphabets(20)}_${Date.now()}`;
  const emptyResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: uniqueKeyword,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Validate empty results
  TestValidator.equals(
    "empty search returns no data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages count",
    emptyResult.pagination.pages,
    0,
  );
  // 6. Test with single character search
  const singleChar = RandomGenerator.alphabets(1);
  const singleCharResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: singleChar,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(singleCharResult);
  // Validate all results contain the single character
  for (const tag of singleCharResult.data) {
    TestValidator.predicate(
      `tag name "${tag.name}" contains single character "${singleChar}"`,
      tag.name.toLowerCase().includes(singleChar.toLowerCase()),
    );
  }
  // 7. Test with multiple word search
  const multiWordSearch = `${RandomGenerator.alphabets(3)}_${RandomGenerator.alphabets(3)}`;
  const multiWordResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: multiWordSearch,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(multiWordResult);
  // Validate all results contain the multi-word search term
  for (const tag of multiWordResult.data) {
    TestValidator.predicate(
      `tag name "${tag.name}" contains multi-word search "${multiWordSearch}"`,
      tag.name.toLowerCase().includes(multiWordSearch.toLowerCase()),
    );
  }
  // 8. Test search with sorting by created_at (descending)
  const sortedByDateResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: searchKeyword,
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedByDateResult);
  // Validate descending sort order by created_at
  for (let i = 1; i < sortedByDateResult.data.length; i++) {
    const prevDate = new Date(
      sortedByDateResult.data[i - 1].created_at,
    ).getTime();
    const currDate = new Date(sortedByDateResult.data[i].created_at).getTime();
    TestValidator.predicate(
      `tags are sorted by created_at descending: "${sortedByDateResult.data[i - 1].created_at}" >= "${sortedByDateResult.data[i].created_at}"`,
      prevDate >= currDate,
    );
  }
}
