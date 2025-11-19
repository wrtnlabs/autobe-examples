import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test searching and filtering articles by specific category.
 *
 * This test validates the category-based article discovery functionality by
 * creating multiple articles across different categories and verifying that
 * search operations correctly filter articles by their assigned category. The
 * test ensures proper category organization, pagination handling, and that
 * article summaries include accurate category information for content
 * discovery.
 *
 * Steps:
 *
 * 1. Create moderator account and authenticate
 * 2. Create two article categories (Economic Discussion, Political Discussion)
 * 3. Create member account and authenticate
 * 4. Create multiple articles in Economic Discussion category
 * 5. Create multiple articles in Political Discussion category
 * 6. Search for articles in Economic Discussion category
 * 7. Verify only Economic Discussion articles are returned
 * 8. Validate pagination and category information
 * 9. Search for articles in Political Discussion category
 * 10. Verify only Political Discussion articles are returned
 */
export async function test_api_article_search_by_category(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create Economic Discussion category
  const economicCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Articles about economic policy, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(economicCategory);

  // Step 3: Create Political Discussion category
  const politicalCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description:
            "Articles about governance, elections, and political systems",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(politicalCategory);

  // Step 4: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Create articles in Economic Discussion category
  const economicArticles = await ArrayUtil.asyncRepeat(3, async (index) => {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: `Economic Analysis ${index + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
          body: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          discussion_board_article_category_id: economicCategory.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });

  // Step 6: Create articles in Political Discussion category
  const politicalArticles = await ArrayUtil.asyncRepeat(2, async (index) => {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: `Political Commentary ${index + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
          body: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          discussion_board_article_category_id: politicalCategory.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });

  // Step 7: Search for articles in Economic Discussion category
  const economicSearchResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        discussion_board_article_category_id: economicCategory.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(economicSearchResults);

  // Step 8: Validate Economic Discussion search results
  TestValidator.equals(
    "economic category search should return exactly 3 articles",
    economicSearchResults.data.length,
    3,
  );

  TestValidator.predicate(
    "all economic search results should belong to Economic Discussion category",
    economicSearchResults.data.every(
      (article) =>
        article.discussion_board_article_category_id === economicCategory.id,
    ),
  );

  TestValidator.predicate(
    "all economic articles should have category summary with correct name",
    economicSearchResults.data.every(
      (article) => article.category.name === "Economic Discussion",
    ),
  );

  TestValidator.equals(
    "economic category search pagination total records",
    economicSearchResults.pagination.records,
    3,
  );

  // Step 9: Search for articles in Political Discussion category
  const politicalSearchResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        discussion_board_article_category_id: politicalCategory.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(politicalSearchResults);

  // Step 10: Validate Political Discussion search results
  TestValidator.equals(
    "political category search should return exactly 2 articles",
    politicalSearchResults.data.length,
    2,
  );

  TestValidator.predicate(
    "all political search results should belong to Political Discussion category",
    politicalSearchResults.data.every(
      (article) =>
        article.discussion_board_article_category_id === politicalCategory.id,
    ),
  );

  TestValidator.predicate(
    "all political articles should have category summary with correct name",
    politicalSearchResults.data.every(
      (article) => article.category.name === "Political Discussion",
    ),
  );

  TestValidator.equals(
    "political category search pagination total records",
    politicalSearchResults.pagination.records,
    2,
  );

  // Step 11: Verify article summaries include author information
  TestValidator.predicate(
    "economic articles should include member author information",
    economicSearchResults.data.every(
      (article) =>
        article.author.id === member.id &&
        article.author.username === member.username,
    ),
  );

  TestValidator.predicate(
    "political articles should include member author information",
    politicalSearchResults.data.every(
      (article) =>
        article.author.id === member.id &&
        article.author.username === member.username,
    ),
  );
}
