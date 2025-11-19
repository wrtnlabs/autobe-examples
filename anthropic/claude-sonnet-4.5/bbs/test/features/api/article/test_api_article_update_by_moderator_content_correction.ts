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
 * Test complete workflow where a moderator updates an existing published
 * article for content correction purposes.
 *
 * This scenario validates the moderator's elevated permission to update any
 * article in the system regardless of authorship. The test creates a category,
 * creates a member who authors an article, then authenticates as a moderator
 * and updates that article's title, body, category, and status.
 *
 * The test verifies that:
 *
 * 1. The update succeeds despite different authorship
 * 2. The is_edited flag is set to true for published articles
 * 3. The updated_at timestamp is refreshed
 * 4. All modified fields reflect the new values
 *
 * This validates moderator content moderation capabilities and proper field
 * updates.
 */
export async function test_api_article_update_by_moderator_content_correction(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for content moderation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator1234",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/moderator/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create initial category as moderator
  const initialCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policies and markets",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(initialCategory);

  // Step 3: Create a second category for update testing
  const updatedCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description: "Discussions about political systems and governance",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Create member account (article author)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member1234",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Member creates an article
  const originalArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Original Economic Analysis on Market Trends",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: initialCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(originalArticle);

  // Validate original article state
  TestValidator.equals(
    "original article is published",
    originalArticle.status,
    "published",
  );
  TestValidator.equals(
    "original article is not edited initially",
    originalArticle.is_edited,
    false,
  );
  TestValidator.equals(
    "original article has initial category",
    originalArticle.category.id,
    initialCategory.id,
  );

  // Store original timestamps for comparison
  const originalUpdatedAt = originalArticle.updated_at;

  // Step 6: Switch to moderator and update the member's article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator1234",
      href: "https://test.example.com/moderator/login",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Moderator updates the article with corrections
  const updatedArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: originalArticle.id,
      body: {
        title: "Corrected Economic Analysis on Market Trends and Policy Impact",
        body: RandomGenerator.content({
          paragraphs: 4,
          sentenceMin: 12,
          sentenceMax: 18,
        }),
        discussion_board_article_category_id: updatedCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 8: Validate update results
  TestValidator.equals(
    "article ID unchanged",
    updatedArticle.id,
    originalArticle.id,
  );
  TestValidator.equals(
    "article title updated",
    updatedArticle.title,
    "Corrected Economic Analysis on Market Trends and Policy Impact",
  );
  TestValidator.equals(
    "article category updated",
    updatedArticle.category.id,
    updatedCategory.id,
  );
  TestValidator.equals(
    "article status remains published",
    updatedArticle.status,
    "published",
  );
  TestValidator.equals(
    "is_edited flag set to true",
    updatedArticle.is_edited,
    true,
  );
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedArticle.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "author remains original member",
    updatedArticle.author.id,
    member.id,
  );
}
