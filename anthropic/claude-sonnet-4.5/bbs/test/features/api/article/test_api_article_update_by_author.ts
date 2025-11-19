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
 * Test that a member can successfully update their own article.
 *
 * This scenario validates the complete ownership-based update workflow where
 * members have permission to modify articles they created. Test updating
 * various fields including title, body, category, and status. Verify that the
 * updated_at timestamp is automatically updated, the is_edited flag is set to
 * true when a published article is modified, and all changes are properly
 * persisted. Validate that only the article owner can perform updates and that
 * unauthorized members receive appropriate error responses.
 *
 * Test Flow:
 *
 * 1. Create moderator account for category management
 * 2. Moderator creates article categories
 * 3. Create member account (article owner)
 * 4. Member creates a published article
 * 5. Member updates the article with new content
 * 6. Validate all changes and automatic field updates
 * 7. Create second member and verify authorization boundaries
 */
export async function test_api_article_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com/moderator/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates article categories
  const category1 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic topics and policies",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description: "Discussions about political topics and governance",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category2);

  // Step 3: Create member account (article owner)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a published article
  const originalTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: originalTitle,
        body: originalBody,
        discussion_board_article_category_id: category1.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Validate initial article state
  TestValidator.equals("article title matches", article.title, originalTitle);
  TestValidator.equals("article body matches", article.body, originalBody);
  TestValidator.equals(
    "article category matches",
    article.category.id,
    category1.id,
  );
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );
  TestValidator.equals(
    "is_edited is initially false",
    article.is_edited,
    false,
  );
  TestValidator.predicate(
    "published_at is set for published article",
    article.published_at !== null && article.published_at !== undefined,
  );

  // Store original timestamps for comparison
  const originalUpdatedAt = article.updated_at;

  // Step 5: Member updates the article
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 9,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 12,
    sentenceMax: 18,
  });

  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
        discussion_board_article_category_id: category2.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 6: Validate all changes and automatic field updates
  TestValidator.equals(
    "updated article ID remains same",
    updatedArticle.id,
    article.id,
  );
  TestValidator.equals("title was updated", updatedArticle.title, updatedTitle);
  TestValidator.equals("body was updated", updatedArticle.body, updatedBody);
  TestValidator.equals(
    "category was changed",
    updatedArticle.category.id,
    category2.id,
  );
  TestValidator.equals(
    "status remains published",
    updatedArticle.status,
    "published",
  );
  TestValidator.equals(
    "is_edited flag is now true",
    updatedArticle.is_edited,
    true,
  );
  TestValidator.predicate(
    "updated_at timestamp was changed",
    updatedArticle.updated_at !== originalUpdatedAt,
  );
  TestValidator.equals(
    "author remains the same",
    updatedArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "published_at remains unchanged",
    updatedArticle.published_at,
    article.published_at,
  );

  // Step 7: Create second member and verify authorization boundaries
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: "member456",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 8: Verify second member cannot update first member's article
  await TestValidator.error("non-owner cannot update article", async () => {
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: {
        title: "Unauthorized update attempt",
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  });
}
