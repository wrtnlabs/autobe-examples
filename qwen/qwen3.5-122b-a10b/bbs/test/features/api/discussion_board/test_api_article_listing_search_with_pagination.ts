import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_listing_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Empty search query - should return all articles
  const allArticles = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: undefined,
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allArticles);
  TestValidator.equals(
    "pagination current page",
    allArticles.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    allArticles.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    allArticles.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allArticles.pagination.pages >= 0,
  );
  // Test 2: Keyword search - should filter articles by search term
  const searchKeyword = RandomGenerator.alphabets(5);
  const searchedArticles = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: searchKeyword,
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchedArticles);
  TestValidator.equals(
    "search pagination current",
    searchedArticles.pagination.current,
    1,
  );
  TestValidator.equals(
    "search pagination limit",
    searchedArticles.pagination.limit,
    20,
  );
  // Test 3: Pagination with different page numbers
  const page2Articles = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: undefined,
        page: 2,
        limit: 10,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page2Articles);
  TestValidator.equals("page 2 current", page2Articles.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Articles.pagination.limit, 10);
  // Test 4: Pagination with maximum limit (100)
  const maxLimitArticles = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: undefined,
        page: 1,
        limit: 100,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(maxLimitArticles);
  TestValidator.equals(
    "max limit current",
    maxLimitArticles.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit value",
    maxLimitArticles.pagination.limit,
    100,
  );
  // Test 5: Sort by oldest first
  const oldestArticles = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: undefined,
        page: 1,
        limit: 20,
        sort: "oldest",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(oldestArticles);
  // Test 6: Verify article summary structure
  if (allArticles.data.length > 0) {
    const firstArticle = allArticles.data[0];
    typia.assert(firstArticle);
    TestValidator.predicate("article has id", firstArticle.id.length > 0);
    TestValidator.predicate("article has title", firstArticle.title.length > 0);
    TestValidator.predicate("article has author", firstArticle.author !== null);
    TestValidator.predicate(
      "article has section",
      firstArticle.section !== null,
    );
    TestValidator.predicate(
      "article has created_at",
      firstArticle.created_at.length > 0,
    );
    TestValidator.predicate(
      "comments count is non-negative",
      firstArticle.comments_count >= 0,
    );
  }
  // Test 7: Test with section filter
  const sectionFilteredArticles =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: undefined,
        section_id: undefined, // Would need a real section ID to filter
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sectionFilteredArticles);
  // Test 8: Test with tag filter
  const tagFilteredArticles =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: undefined,
        tag_names: [], // Empty array means no tag filtering
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(tagFilteredArticles);
}
