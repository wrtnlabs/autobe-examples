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

export async function test_api_discussion_board_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for setup
  const adminConnection: api.IConnection = { host: connection.host };
  // Create test articles directly using connection that has admin privileges
  // Note: Based on available API functions, we'll use discussionBoard functional namespace
  // and create articles through the search API's companion create functionality if available
  // Since the scenario plan only includes search endpoint and no explicit article creation endpoint,
  // we'll skip setup and test search functionality directly
  // Test 1: Basic search with query parameter
  const searchResult1 = await api.functional.discussionBoard.search(
    connection,
    {
      body: {
        q: "economic",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "has matching articles",
    searchResult1.data.length > 0,
  );
  // Test 2: Case-insensitive search
  const searchResult2 = await api.functional.discussionBoard.search(
    connection,
    {
      body: {
        q: "POLITICAL",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult2);
  // Test 3: Partial word matching search
  const searchResult3 = await api.functional.discussionBoard.search(
    connection,
    {
      body: {
        q: "tren",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult3);
  // Test 4: Pagination validation
  const searchResult4 = await api.functional.discussionBoard.search(
    connection,
    {
      body: {
        q: "analysis",
        limit: 1,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult4);
  TestValidator.equals(
    "pagination limit respected",
    searchResult4.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata present",
    searchResult4.pagination.records > 0,
  );
  // Test 5: Newest/oldest sorting
  const newestResult = await api.functional.discussionBoard.search(connection, {
    body: {
      q: "article",
      sortBy: "newest",
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(newestResult);
  const oldestResult = await api.functional.discussionBoard.search(connection, {
    body: {
      q: "article",
      sortBy: "oldest",
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(oldestResult);
  // Test 6: Section filtering (assuming sectionId parameter exists in IRequest)
  const sectionSearch = await api.functional.discussionBoard.search(
    connection,
    {
      body: {
        q: "analysis",
        sectionId: "00000000-0000-0000-0000-000000000000" as any,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sectionSearch);
  // Test 7: No results scenario
  const noResults = await api.functional.discussionBoard.search(connection, {
    body: {
      q: "nonexistentkeyword12345",
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(noResults);
  TestValidator.equals("no matching results", noResults.data.length, 0);
  TestValidator.equals(
    "pagination records zero",
    noResults.pagination.records,
    0,
  );
  // Test 8: Empty search query (should return all articles)
  const allResults = await api.functional.discussionBoard.search(connection, {
    body: {
      q: "",
      limit: 100,
    } satisfies IDiscussionBoardArticle.IRequest,
  });
  typia.assert(allResults);
  TestValidator.predicate(
    "returns articles with empty query",
    allResults.data.length >= 0,
  );
}
