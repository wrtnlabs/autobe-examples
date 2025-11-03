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
 * Test article search result sorting by relevance ranking.
 *
 * This test validates the relevance-based sorting mechanism of the article
 * search API. When users search for keywords, the system ranks results with
 * title matches weighted higher than content matches. The test creates articles
 * with search keywords in various positions (title, content, multiple keywords)
 * and verifies that the search results are properly ordered by relevance.
 *
 * Test workflow:
 *
 * 1. Create a member account for article authorship
 * 2. Create articles with different keyword placements:
 *
 *    - Article with keyword in title (highest relevance)
 *    - Article with keyword in content only (lower relevance)
 *    - Article with multiple keyword matches in title (high relevance)
 *    - Article with single keyword match in content (lowest relevance)
 * 3. Search for keywords and validate the order of results
 * 4. Verify that title matches appear before content-only matches
 * 5. Verify that multiple keyword matches rank higher than single matches
 */
export async function test_api_article_search_sorted_by_relevance(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "SecurePass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);

  // Step 2: Create articles with different keyword placements
  const searchKeyword = "economics";
  const secondKeyword = "policy";

  // Article 1: Keyword in title (highest relevance)
  const article1 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `Understanding ${searchKeyword} fundamentals`,
        content: RandomGenerator.content({ paragraphs: 3 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  // Article 2: Keyword in content only (lower relevance)
  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Market analysis and trading strategies",
        content: `This article discusses various aspects of ${searchKeyword} and its impact on markets. Understanding ${searchKeyword} principles is essential for traders.`,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  // Article 3: Multiple keywords in title (very high relevance)
  const article3 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `${searchKeyword} and ${secondKeyword}: Modern approaches`,
        content: RandomGenerator.content({ paragraphs: 3 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  // Article 4: Single keyword in content (lowest relevance)
  const article4 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Investment strategies for beginners",
        content: RandomGenerator.content({
          paragraphs: 2,
        }).concat(
          ` Many novice investors wonder about ${searchKeyword} concepts.`,
        ),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article4);

  // Step 3: Search for the keyword and validate relevance-based ordering
  const searchResults =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        search: searchKeyword,
        sort_by: "relevance",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults);

  // Step 4: Verify the ordering - articles with title matches should appear first
  TestValidator.predicate(
    "search results should return multiple articles",
    searchResults.data.length >= 3,
  );

  // Find the positions of our created articles in the results
  const article1Position = searchResults.data.findIndex(
    (a) => a.id === article1.id,
  );
  const article2Position = searchResults.data.findIndex(
    (a) => a.id === article2.id,
  );
  const article3Position = searchResults.data.findIndex(
    (a) => a.id === article3.id,
  );
  const article4Position = searchResults.data.findIndex(
    (a) => a.id === article4.id,
  );

  // Verify that articles with title matches appear before content-only matches
  // Article 1 (title match) should rank higher than Article 2 (content-only match)
  if (article1Position !== -1 && article2Position !== -1) {
    TestValidator.predicate(
      "article with title match should rank higher than content-only match",
      article1Position < article2Position,
    );
  }

  // Verify that articles with title matches appear before content-only matches
  // Article 1 (title match) should rank higher than Article 4 (content-only match)
  if (article1Position !== -1 && article4Position !== -1) {
    TestValidator.predicate(
      "article with single title match should rank higher than content-only match",
      article1Position < article4Position,
    );
  }

  // Step 5: Verify that multiple keyword matches rank higher
  // Article 3 (multiple keywords in title) should rank higher than or equal to Article 1
  if (article3Position !== -1 && article1Position !== -1) {
    TestValidator.predicate(
      "article with multiple keyword matches should rank as high or higher than single keyword",
      article3Position <= article1Position,
    );
  }

  // Article 3 (multiple title keywords) should rank higher than Article 2 (content-only)
  if (article3Position !== -1 && article2Position !== -1) {
    TestValidator.predicate(
      "article with multiple title keywords should rank higher than content-only match",
      article3Position < article2Position,
    );
  }

  // Additional validation: Verify all articles are in the results
  TestValidator.predicate(
    "all created articles should appear in search results",
    article1Position !== -1 &&
      article2Position !== -1 &&
      article3Position !== -1 &&
      article4Position !== -1,
  );
}
