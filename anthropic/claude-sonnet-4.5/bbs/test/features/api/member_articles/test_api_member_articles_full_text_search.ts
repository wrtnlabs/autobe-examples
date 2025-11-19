import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test full-text search functionality for member articles.
 *
 * This test validates that the article search API correctly accepts and
 * processes search parameters for filtering articles. Since article creation is
 * not available in the provided API operations, this test focuses on validating
 * the search API's ability to handle search queries and return properly
 * structured results.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Query all articles for the member without search filter
 * 3. Query articles with a search keyword to test search functionality
 * 4. Validate response structure and pagination
 * 5. Verify search parameter is properly processed by the API
 */
export async function test_api_member_articles_full_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "testPassword123!",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Query all articles without search filter
  const allArticlesResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(allArticlesResult);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "pagination should have valid current page",
    allArticlesResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    allArticlesResult.pagination.limit === 20,
  );

  TestValidator.predicate(
    "data should be an array",
    Array.isArray(allArticlesResult.data),
  );

  // Step 4: Test search functionality with a keyword
  const searchKeyword = "discussion";
  const searchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
        search: searchKeyword,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate search result structure
  TestValidator.predicate(
    "search result should have valid pagination",
    searchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "search result data should be an array",
    Array.isArray(searchResult.data),
  );

  // Step 6: Test with different search parameters to verify API flexibility
  const emptySearchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 10,
        search: "",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptySearchResult);

  TestValidator.predicate(
    "empty search should return valid response",
    emptySearchResult.pagination.limit === 10,
  );
}
