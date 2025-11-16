import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test the article search functionality using keyword search across article
 * titles and body content.
 *
 * This test validates the GIN-indexed full-text search by creating multiple
 * articles with distinct content and then searching using keywords. It verifies
 * case-insensitive matching, partial keyword matching, and ensures that only
 * articles containing the search term in either title or body are returned. The
 * test also validates proper pagination metadata and article summaries with
 * engagement metrics like view_count.
 *
 * Test Flow:
 *
 * 1. Create a member account for authentication
 * 2. Publish several articles with distinct, searchable content
 * 3. Perform keyword search operations
 * 4. Validate search results match expected filtering criteria
 * 5. Verify pagination structure and article summary completeness
 */
export async function test_api_article_search_with_keyword(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123!";
  const memberUsername = RandomGenerator.name(2);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create articles with distinctive searchable content
  // Use a unique keyword for precise search validation
  const uniqueKeyword = "ECONOMICPOLICY2024";

  // Article 1: Keyword in title only
  const article1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: `Analysis of ${uniqueKeyword} impact on markets`,
        body: "This article discusses the comprehensive effects and long-term implications for various economic sectors.",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article1);

  // Article 2: Keyword in body only
  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: "Understanding modern fiscal strategies",
        body: `The recent changes in ${uniqueKeyword} have created new opportunities for investment and growth in emerging markets.`,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);

  // Article 3: Keyword in both title and body
  const article3: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: `${uniqueKeyword} framework overview`,
        body: `This comprehensive guide explains how ${uniqueKeyword} influences international trade agreements and regulatory compliance.`,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article3);

  // Article 4: No keyword (control article - should NOT appear in search)
  const article4: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: "General discussion about political reforms",
        body: "This article covers various aspects of governmental changes and their societal impacts without specific policy references.",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article4);

  // Article 5: Another control article without keyword
  const article5: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: "Technological innovation trends",
        body: "Exploring the latest developments in artificial intelligence and machine learning applications across industries.",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article5);

  // Step 3: Perform search with the unique keyword
  const searchResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: uniqueKeyword,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults);

  // Step 4: Validate search results
  // Should return exactly 3 articles (article1, article2, article3)
  TestValidator.equals(
    "search should return exactly 3 matching articles",
    searchResults.data.length,
    3,
  );

  // Verify pagination metadata is present and correct
  TestValidator.predicate(
    "pagination metadata should be complete",
    searchResults.pagination !== null && searchResults.pagination !== undefined,
  );

  TestValidator.equals(
    "pagination records should match returned data count",
    searchResults.pagination.records,
    3,
  );

  // Verify all returned articles contain the search keyword
  const article1Found = searchResults.data.find((a) => a.id === article1.id);
  const article2Found = searchResults.data.find((a) => a.id === article2.id);
  const article3Found = searchResults.data.find((a) => a.id === article3.id);
  const article4Found = searchResults.data.find((a) => a.id === article4.id);
  const article5Found = searchResults.data.find((a) => a.id === article5.id);

  TestValidator.predicate(
    "article1 with keyword in title should be in results",
    article1Found !== undefined,
  );

  TestValidator.predicate(
    "article2 with keyword in body should be in results",
    article2Found !== undefined,
  );

  TestValidator.predicate(
    "article3 with keyword in both title and body should be in results",
    article3Found !== undefined,
  );

  TestValidator.predicate(
    "article4 without keyword should NOT be in results",
    article4Found === undefined,
  );

  TestValidator.predicate(
    "article5 without keyword should NOT be in results",
    article5Found === undefined,
  );

  // Step 5: Validate article summary structure - typia.assert handles all validation
  for (const articleSummary of searchResults.data) {
    typia.assert(articleSummary);
  }

  // Step 6: Test case-insensitive search
  const lowerCaseSearch: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: uniqueKeyword.toLowerCase(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(lowerCaseSearch);

  TestValidator.equals(
    "case-insensitive search should return same number of results",
    lowerCaseSearch.data.length,
    3,
  );

  // Step 7: Test partial keyword search
  const partialKeyword = uniqueKeyword.substring(0, 10);
  const partialSearch: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: partialKeyword,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(partialSearch);

  TestValidator.predicate(
    "partial keyword search should return matching articles",
    partialSearch.data.length >= 3,
  );
}
