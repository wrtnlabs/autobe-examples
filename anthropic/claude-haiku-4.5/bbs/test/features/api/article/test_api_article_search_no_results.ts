import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article search when no articles match the search criteria.
 *
 * This test validates the article search functionality when searching with
 * non-existent keywords that don't match any articles in the database. The test
 * ensures the API properly handles empty search results by:
 *
 * 1. Creating a member account
 * 2. Creating sample articles with specific keywords
 * 3. Searching with non-matching keywords to verify empty results
 * 4. Validating response structure and empty state indicators
 * 5. Verifying pagination shows total count of zero
 */
export async function test_api_article_search_no_results(
  connection: api.IConnection,
) {
  // Step 1: Register a member account
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Step 2: Create sample articles with specific keywords
  const article1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Economic Impact of Trade Policies",
        content:
          "This article discusses the economic implications of international trade policies and their effects on market dynamics.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article1);

  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Political Systems and Governance",
        content:
          "An in-depth analysis of various political systems and how governance structures influence society.",
        category_code: "politics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);

  // Step 3: Search with non-existent keywords
  const searchResultEmpty: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        search: "nonexistentKeywordThatDoesNotMatchAnyArticles",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResultEmpty);

  // Step 4: Validate empty search results
  TestValidator.equals(
    "search result data array should be empty",
    searchResultEmpty.data.length,
    0,
  );

  TestValidator.equals(
    "total records in pagination should be zero",
    searchResultEmpty.pagination.records,
    0,
  );

  TestValidator.equals(
    "current page should be 1",
    searchResultEmpty.pagination.current,
    1,
  );

  TestValidator.equals(
    "pages count should be zero for empty results",
    searchResultEmpty.pagination.pages,
    0,
  );

  TestValidator.predicate(
    "data array should be empty array",
    Array.isArray(searchResultEmpty.data) &&
      searchResultEmpty.data.length === 0,
  );

  // Step 5: Search with different non-matching keywords
  const searchResultAnother: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        search: "xyzabc123invalidSearchPhrase",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResultAnother);

  TestValidator.equals(
    "another empty search should return zero records",
    searchResultAnother.pagination.records,
    0,
  );

  // Step 6: Verify that articles created are findable with correct keywords
  const searchWithValidKeyword: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        search: "Economic",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchWithValidKeyword);

  TestValidator.predicate(
    "search with matching keyword should return results",
    searchWithValidKeyword.pagination.records > 0,
  );
}
