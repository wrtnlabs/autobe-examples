import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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

export async function test_api_article_search_empty_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Empty database scenario - no articles exist
  const emptyResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: RandomGenerator.paragraph({ sentences: 2 }),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result should have zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result should have zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result should have empty data array",
    emptyResult.data.length,
    0,
  );
  // Test 2: Search with non-existent term
  const nonExistentSearch = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "nonexistentsearchtermthatshouldnotmatchanything",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(nonExistentSearch);
  TestValidator.equals(
    "non-existent search should have zero records",
    nonExistentSearch.pagination.records,
    0,
  );
  // Test 3: Empty search string
  const emptySearch = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search should return valid pagination",
    emptySearch.pagination.records >= 0 && emptySearch.pagination.pages >= 0,
  );
  // Test 4: Boundary pagination - minimum page size
  const minPageSize = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: RandomGenerator.paragraph({ sentences: 1 }),
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(minPageSize);
  TestValidator.equals(
    "minimum page size should be respected",
    minPageSize.pagination.limit,
    1,
  );
  // Test 5: Boundary pagination - maximum page size
  const maxPageSize = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: RandomGenerator.paragraph({ sentences: 1 }),
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(maxPageSize);
  TestValidator.equals(
    "maximum page size should be respected",
    maxPageSize.pagination.limit,
    100,
  );
  // Test 6: High page number with empty results
  const highPageEmpty = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "nonexistentterm",
        page: 999,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(highPageEmpty);
  TestValidator.equals(
    "high page with no results should have zero records",
    highPageEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "high page with no results should have zero pages",
    highPageEmpty.pagination.pages,
    0,
  );
  // Test 7: Non-existent section ID filtering
  const nonExistentSection =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(nonExistentSection);
  TestValidator.predicate(
    "non-existent section filter should return valid response",
    nonExistentSection.pagination.records >= 0,
  );
  // Test 8: Combined search and section filtering with non-existent values
  const combinedFilter = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "nonexistentsearch",
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter with non-existent values should return valid pagination",
    combinedFilter.pagination.records >= 0 &&
      combinedFilter.pagination.pages >= 0,
  );
  // Test 9: Random valid search parameters
  const randomSearch = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: typia.random<IDiscussionBoardArticle.IRequest>(),
    },
  );
  typia.assert(randomSearch);
  TestValidator.predicate(
    "random search should return valid pagination structure",
    randomSearch.pagination.current >= 0 &&
      randomSearch.pagination.limit >= 1 &&
      randomSearch.pagination.limit <= 100 &&
      randomSearch.pagination.records >= 0 &&
      randomSearch.pagination.pages >= 0,
  );
}
