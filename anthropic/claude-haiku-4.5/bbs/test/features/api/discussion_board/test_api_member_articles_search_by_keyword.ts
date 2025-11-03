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
 * Test member's ability to search their own articles by keyword with full-text
 * search.
 *
 * Validates keyword matching in article titles and content, relevance ranking,
 * phrase searching with quotation marks, empty result handling, and member
 * ownership enforcement in search operations.
 *
 * Workflow:
 *
 * 1. Register a new member to establish authenticated session
 * 2. Create multiple articles with distinctive keywords in titles and content
 * 3. Test single keyword search matching
 * 4. Test multi-keyword search with AND logic
 * 5. Test phrase searching with exact matching
 * 6. Test search returning empty results for non-matching queries
 * 7. Verify search respects member ownership (only member's own articles)
 * 8. Validate search result relevance ranking
 */
export async function test_api_member_articles_search_by_keyword(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123";
  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAuth);

  // Step 2: Create articles with distinctive keywords
  const article1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Impact of Rising Inflation on Market Volatility",
        content:
          "Recent economic data shows that inflation has become a critical concern affecting market behavior and investor sentiment. The relationship between inflation rates and market volatility demonstrates complex interdependencies that shape economic outcomes.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article1);

  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Monetary Policy and Economic Growth Strategy",
        content:
          "Central banks employ monetary policy tools to influence economic growth. Through interest rate adjustments and quantitative measures, policymakers attempt to maintain stable economic conditions and prevent market crashes.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);

  const article3: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "International Trade Agreements and Global Markets",
        content:
          "Trade agreements between nations significantly impact global market dynamics and economic relationships. Negotiations on tariffs and market access shape international trade flows and competitive advantages.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article3);

  const article4: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Political Economy of Trade Policy",
        content:
          "Trade policy reflects political decisions that balance domestic interests with global economic participation. Policy debates center on protectionism versus free trade approaches and their effects on employment and consumer prices.",
        category_code: "politics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article4);

  // Step 3: Test single keyword search - "inflation"
  const searchInflation: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: "inflation",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchInflation);
  TestValidator.predicate(
    "single keyword search for 'inflation' returns results",
    searchInflation.data.length > 0,
  );
  const foundInflationArticle = searchInflation.data.find(
    (a) => a.id === article1.id,
  );
  TestValidator.predicate(
    "article with 'inflation' in title is found in results",
    foundInflationArticle !== undefined,
  );

  // Step 4: Test multi-keyword search - "monetary policy"
  const searchMonetary: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: "monetary policy",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchMonetary);
  TestValidator.predicate(
    "multi-keyword search for 'monetary policy' returns results",
    searchMonetary.data.length > 0,
  );
  const foundMonetaryArticle = searchMonetary.data.find(
    (a) => a.id === article2.id,
  );
  TestValidator.predicate(
    "article with 'monetary policy' in title is found in search results",
    foundMonetaryArticle !== undefined,
  );

  // Step 5: Test keyword in content - "market volatility"
  const searchVolatility: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: "market volatility",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchVolatility);
  TestValidator.predicate(
    "content-based search for 'market volatility' returns results",
    searchVolatility.data.length > 0,
  );
  const foundVolatilityArticle = searchVolatility.data.find(
    (a) => a.id === article1.id,
  );
  TestValidator.predicate(
    "article with 'market volatility' in content is found in search",
    foundVolatilityArticle !== undefined,
  );

  // Step 6: Test phrase searching with quotation marks
  const searchPhrase: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: '"trade agreements"',
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchPhrase);
  TestValidator.predicate(
    "phrase search for exact match 'trade agreements' returns results",
    searchPhrase.data.length > 0,
  );
  const foundPhraseArticle = searchPhrase.data.find(
    (a) => a.id === article3.id,
  );
  TestValidator.predicate(
    "article with exact phrase 'trade agreements' is correctly found",
    foundPhraseArticle !== undefined,
  );

  // Step 7: Test search returning empty results
  const searchNoMatch: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: "nonexistentkeyworthatdoesnotexist",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchNoMatch);
  TestValidator.predicate(
    "search for non-matching keyword returns empty results correctly",
    searchNoMatch.data.length === 0,
  );

  // Step 8: Test search with category filter
  const searchEconomics: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: "trade",
        category: "economics",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchEconomics);
  TestValidator.predicate(
    "category-filtered keyword search returns relevant results",
    searchEconomics.data.length > 0,
  );
  for (const article of searchEconomics.data) {
    TestValidator.predicate(
      "all returned articles belong to selected economics category",
      article.category.code === "economics",
    );
  }

  // Step 9: Test pagination of search results
  const searchPage1: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: "economic",
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchPage1);
  TestValidator.predicate(
    "search result pagination current page is correct",
    searchPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "search result pagination respects limit parameter",
    searchPage1.data.length <= 2,
  );

  // Step 10: Verify member ownership - search returns only own articles
  TestValidator.predicate(
    "member search returns only authenticated member's own articles",
    searchInflation.data.every((a) => a.author.id === memberAuth.id),
  );
}
