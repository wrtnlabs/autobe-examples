import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function test_api_article_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with keyword matching
  const keyword = RandomGenerator.alphabets(5);
  const searchResult1 = await api.functional.discussionBoard.articles.index(
    { ...connection, simulate: true },
    {
      body: {
        search: keyword,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult1);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    searchResult1.pagination.limit > 0,
  );
  TestValidator.predicate("data is array", Array.isArray(searchResult1.data));
  // Test 2: Empty search results
  const emptyKeyword = `zzz${RandomGenerator.alphabets(10)}`;
  const searchResult2 = await api.functional.discussionBoard.articles.index(
    { ...connection, simulate: true },
    {
      body: {
        search: emptyKeyword,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult2);
  TestValidator.equals(
    "empty search data is array",
    Array.isArray(searchResult2.data),
    true,
  );
  // Test 3: Search with pagination parameters
  const searchResult3 = await api.functional.discussionBoard.articles.index(
    { ...connection, simulate: true },
    {
      body: {
        search: RandomGenerator.alphabets(3),
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult3);
  TestValidator.equals("page 2 returned", searchResult3.pagination.current, 2);
  TestValidator.equals("limit 10 applied", searchResult3.pagination.limit, 10);
  // Test 4: Search with section filtering
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const searchResult4 = await api.functional.discussionBoard.articles.index(
    { ...connection, simulate: true },
    {
      body: {
        search: RandomGenerator.alphabets(4),
        sectionId: sectionId,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult4);
  TestValidator.predicate(
    "section filtering works",
    searchResult4.pagination !== undefined,
  );
  // Test 5: Search with sorting parameters
  const searchResult5 = await api.functional.discussionBoard.articles.index(
    { ...connection, simulate: true },
    {
      body: {
        search: RandomGenerator.alphabets(4),
        sortBy: "title",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult5);
  TestValidator.predicate(
    "sorting parameters accepted",
    searchResult5.pagination !== undefined,
  );
}
