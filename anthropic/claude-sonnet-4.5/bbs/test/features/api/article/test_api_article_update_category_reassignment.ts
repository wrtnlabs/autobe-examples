import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test article category reassignment workflow for content reclassification.
 *
 * This test validates that articles can be successfully moved between different
 * discussion board categories (Economic Discussion, Political Discussion,
 * General Discussion) to maintain proper content organization. The test creates
 * multiple categories, creates an article under one category, then updates it
 * to a different category and verifies the reassignment succeeded.
 *
 * Test Flow:
 *
 * 1. Create moderator account for category management
 * 2. Create first category (Economic Discussion)
 * 3. Create second category (Political Discussion)
 * 4. Create member account for article operations
 * 5. Create article assigned to first category
 * 6. Update article to reassign to second category
 * 7. Verify updated article contains new category information
 */
export async function test_api_article_update_category_reassignment(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator-password-123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create first category (Economic Discussion)
  const economicCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economic policy, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(economicCategory);

  // Step 3: Create second category (Political Discussion)
  const politicalCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description:
            "Discussions about governance, elections, and political systems",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(politicalCategory);

  // Step 4: Create member account for article operations
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member-password-123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Create article assigned to first category (Economic Discussion)
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
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

  // Verify article was created with first category
  TestValidator.equals(
    "article initially assigned to economic category",
    article.category.id,
    economicCategory.id,
  );

  // Step 6: Update article to reassign to second category (Political Discussion)
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_category_id: politicalCategory.id,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 7: Verify article was reassigned to new category
  TestValidator.equals(
    "article reassigned to political category",
    updatedArticle.category.id,
    politicalCategory.id,
  );

  TestValidator.equals(
    "category name updated in response",
    updatedArticle.category.name,
    "Political Discussion",
  );

  TestValidator.equals(
    "category slug updated in response",
    updatedArticle.category.slug,
    "political-discussion",
  );

  // Verify article ID remains the same
  TestValidator.equals(
    "article ID unchanged after category reassignment",
    updatedArticle.id,
    article.id,
  );
}
