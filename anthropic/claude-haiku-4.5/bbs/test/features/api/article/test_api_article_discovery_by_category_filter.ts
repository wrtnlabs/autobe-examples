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
 * Test article filtering by category functionality.
 *
 * This test validates that the discussion board article discovery system
 * correctly filters articles by category. The test creates multiple articles in
 * different categories (Economics and Politics), then verifies that:
 *
 * 1. Filtering by Economics category returns only Economics articles
 * 2. Filtering by Politics category returns only Politics articles
 * 3. Articles from non-selected categories are properly excluded from results
 * 4. Search results respect category filters
 *
 * Flow:
 *
 * 1. Register a member to create articles
 * 2. Create an article in the Economics category
 * 3. Create an article in the Politics category
 * 4. Search/filter articles by Economics category and verify only Economics
 *    articles appear
 * 5. Search/filter articles by Politics category and verify only Politics articles
 *    appear
 * 6. Verify that filtering works correctly and excludes articles from other
 *    categories
 */
export async function test_api_article_discovery_by_category_filter(
  connection: api.IConnection,
) {
  // Step 1: Register a member account to create articles
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123"; // Must meet requirements: 8+ chars, uppercase, lowercase, number

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member registered successfully",
    memberAuth.token.access !== null,
  );

  // Step 2: Create an article in Economics category
  const economicsArticleData = {
    title: "Impact of Rising Interest Rates on Market Volatility",
    content:
      "This article discusses how central bank monetary policy decisions affect market dynamics and economic growth through interest rate adjustments and inflation management strategies.",
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const economicsArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: economicsArticleData,
    });
  typia.assert(economicsArticle);
  TestValidator.equals(
    "economics article category",
    economicsArticle.category.code,
    "economics",
  );

  // Step 3: Create an article in Politics category
  const politicsArticleData = {
    title:
      "Climate Change Policy: International Agreements and National Implementation",
    content:
      "An examination of global political frameworks for addressing climate change, including international treaties, national policy responses, and political obstacles to environmental regulation implementation.",
    category_code: "politics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const politicsArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: politicsArticleData,
    });
  typia.assert(politicsArticle);
  TestValidator.equals(
    "politics article category",
    politicsArticle.category.code,
    "politics",
  );

  // Step 4: Search/filter articles by Economics category
  const economicsFilterResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        category: "economics",
        limit: 20,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(economicsFilterResults);

  TestValidator.predicate(
    "economics filter returns articles",
    economicsFilterResults.data.length > 0,
  );

  // Verify all returned articles are in Economics category
  const allEconomicsArticles = economicsFilterResults.data.every(
    (article) => article.category.code === "economics",
  );
  TestValidator.predicate(
    "all filtered articles are economics category",
    allEconomicsArticles,
  );

  // Step 5: Search/filter articles by Politics category
  const politicsFilterResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        category: "politics",
        limit: 20,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(politicsFilterResults);

  TestValidator.predicate(
    "politics filter returns articles",
    politicsFilterResults.data.length > 0,
  );

  // Verify all returned articles are in Politics category
  const allPoliticsArticles = politicsFilterResults.data.every(
    (article) => article.category.code === "politics",
  );
  TestValidator.predicate(
    "all filtered articles are politics category",
    allPoliticsArticles,
  );

  // Step 6: Verify category filtering properly excludes articles from other categories
  const economicsHasNoPolitics = economicsFilterResults.data.every(
    (article) => article.category.code !== "politics",
  );
  TestValidator.predicate(
    "economics filter excludes politics articles",
    economicsHasNoPolitics,
  );

  const politicsHasNoEconomics = politicsFilterResults.data.every(
    (article) => article.category.code !== "economics",
  );
  TestValidator.predicate(
    "politics filter excludes economics articles",
    politicsHasNoEconomics,
  );

  // Step 7: Verify specific articles are in correct filtered results
  const economicsArticleFound = economicsFilterResults.data.some(
    (article) => article.id === economicsArticle.id,
  );
  TestValidator.predicate(
    "created economics article appears in economics filter results",
    economicsArticleFound,
  );

  const politicsArticleFound = politicsFilterResults.data.some(
    (article) => article.id === politicsArticle.id,
  );
  TestValidator.predicate(
    "created politics article appears in politics filter results",
    politicsArticleFound,
  );

  // Step 8: Verify no cross-contamination - created articles don't appear in wrong category
  const economicsArticleNotInPolitics = politicsFilterResults.data.every(
    (article) => article.id !== economicsArticle.id,
  );
  TestValidator.predicate(
    "economics article does not appear in politics filter",
    economicsArticleNotInPolitics,
  );

  const politicsArticleNotInEconomics = economicsFilterResults.data.every(
    (article) => article.id !== politicsArticle.id,
  );
  TestValidator.predicate(
    "politics article does not appear in economics filter",
    politicsArticleNotInEconomics,
  );
}
