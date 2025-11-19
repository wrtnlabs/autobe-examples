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
 * Test moderator's ability to recategorize an article by updating its category
 * assignment.
 *
 * This test creates two categories (Economic Discussion and Political
 * Discussion), creates a member who publishes an article in the first category,
 * then authenticates as a moderator and updates the article to reassign it to
 * the second category.
 *
 * The test validates that category reassignment succeeds, the article now
 * references the new category ID, and the category relationship is properly
 * updated. This ensures moderators can correct miscategorized content and
 * maintain proper topic organization.
 */
export async function test_api_article_update_by_moderator_category_reassignment(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.Format<"password">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create first category (Economic Discussion)
  const firstCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economic policies, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(firstCategory);

  // Step 3: Create second category (Political Discussion)
  const secondCategory =
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
  typia.assert(secondCategory);

  // Step 4: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Member creates article in first category
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 6,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: firstCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Validate article is initially in first category
  TestValidator.equals(
    "article initially assigned to first category",
    article.category.id,
    firstCategory.id,
  );

  // Step 6: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Moderator reassigns article to second category
  const updatedArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_category_id: secondCategory.id,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 8: Validate category reassignment
  TestValidator.equals(
    "article reassigned to second category",
    updatedArticle.category.id,
    secondCategory.id,
  );

  TestValidator.notEquals(
    "article no longer in first category",
    updatedArticle.category.id,
    firstCategory.id,
  );

  TestValidator.equals(
    "category name matches second category",
    updatedArticle.category.name,
    secondCategory.name,
  );

  TestValidator.equals(
    "category slug matches second category",
    updatedArticle.category.slug,
    secondCategory.slug,
  );
}
