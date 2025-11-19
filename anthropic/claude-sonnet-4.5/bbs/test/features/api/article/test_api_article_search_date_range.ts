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
 * Test filtering articles by publication date range using published_after and
 * published_before parameters.
 *
 * This test validates temporal filtering for content discovery by:
 *
 * 1. Creating a moderator and setting up article categories
 * 2. Creating a member and publishing multiple articles
 * 3. Testing published_after filter to find articles after a specific date
 * 4. Testing published_before filter to find articles before a specific date
 * 5. Testing combined date range filtering with both parameters
 * 6. Verifying that only articles within specified time ranges are returned
 */
export async function test_api_article_search_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(10),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for date range testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.alphaNumeric(10),
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });

  // Step 4: Create 5 published articles
  const articles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < 5; i++) {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: `Article ${i + 1} - ${RandomGenerator.paragraph({ sentences: 3 })}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }

  // Sort articles by published_at to ensure predictable ordering
  articles.sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return dateA - dateB;
  });

  // Step 5: Test published_after filter using actual article timestamps
  const secondArticleDate = articles[1].published_at;
  if (secondArticleDate) {
    const afterResults = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          published_after: secondArticleDate,
          discussion_board_article_category_id: category.id,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(afterResults);

    // Validate that all returned articles are published after or at the specified date
    for (const articleSummary of afterResults.data) {
      const articleDate = articleSummary.published_at;
      if (articleDate) {
        TestValidator.predicate(
          "article published_at should be >= published_after filter",
          new Date(articleDate) >= new Date(secondArticleDate),
        );
      }
    }
  }

  // Step 6: Test published_before filter using actual article timestamps
  const fourthArticleDate = articles[3].published_at;
  if (fourthArticleDate) {
    const beforeResults = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          published_before: fourthArticleDate,
          discussion_board_article_category_id: category.id,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(beforeResults);

    // Validate that all returned articles are published before or at the specified date
    for (const articleSummary of beforeResults.data) {
      const articleDate = articleSummary.published_at;
      if (articleDate) {
        TestValidator.predicate(
          "article published_at should be <= published_before filter",
          new Date(articleDate) <= new Date(fourthArticleDate),
        );
      }
    }
  }

  // Step 7: Test combined date range using actual article timestamps
  const startDate = articles[1].published_at;
  const endDate = articles[3].published_at;
  if (startDate && endDate) {
    const rangeResults = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          published_after: startDate,
          published_before: endDate,
          discussion_board_article_category_id: category.id,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(rangeResults);

    // Validate that all returned articles are within the date range
    for (const articleSummary of rangeResults.data) {
      const articleDate = articleSummary.published_at;
      if (articleDate) {
        const pubDate = new Date(articleDate);
        TestValidator.predicate(
          "article published_at should be >= published_after",
          pubDate >= new Date(startDate),
        );
        TestValidator.predicate(
          "article published_at should be <= published_before",
          pubDate <= new Date(endDate),
        );
      }
    }
  }
}
