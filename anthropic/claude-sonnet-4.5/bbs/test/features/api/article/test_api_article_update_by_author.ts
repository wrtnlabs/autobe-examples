import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that a member can successfully update their own article content
 * including title, body, summary, categories, and tags.
 *
 * This test validates the ownership-based editing permission model in the
 * discussion board system. It ensures that members can modify their published
 * content while maintaining proper version control and audit trails.
 *
 * Business flow:
 *
 * 1. Register a member account for article authorship
 * 2. Create categories for article classification
 * 3. Create an initial article with specific content
 * 4. Update the article with new title, body, summary, and categories
 * 5. Verify all updated fields are correctly reflected
 * 6. Confirm timestamp behavior (updated_at changed, created_at preserved)
 */
export async function test_api_article_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create categories for article classification
  const category1 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category2);

  // Step 3: Create initial article with specific content
  const originalTitle = `Original Title ${RandomGenerator.name(3)}`;
  const originalBody = RandomGenerator.content({ paragraphs: 3 });
  const originalSummary = RandomGenerator.paragraph({ sentences: 2 });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: originalTitle,
        body: originalBody,
        summary: originalSummary,
        category_ids: [category1.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Verify initial article creation
  TestValidator.equals("initial title matches", article.title, originalTitle);
  TestValidator.equals("initial body matches", article.body, originalBody);
  TestValidator.equals(
    "initial summary matches",
    article.summary,
    originalSummary,
  );
  TestValidator.equals("initial category count", article.categories.length, 1);
  TestValidator.equals(
    "initial category ID",
    article.categories[0].id,
    category1.id,
  );

  // Store original timestamps for later comparison
  const originalCreatedAt = article.created_at;
  const originalUpdatedAt = article.updated_at;

  // Step 4: Update the article with new content
  const updatedTitle = `Updated Title ${RandomGenerator.name(3)}`;
  const updatedBody = RandomGenerator.content({ paragraphs: 4 });
  const updatedSummary = RandomGenerator.paragraph({ sentences: 3 });

  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
        summary: updatedSummary,
        category_ids: [category2.id],
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 5: Verify all updated fields are correctly reflected
  TestValidator.equals(
    "updated title matches",
    updatedArticle.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated body matches",
    updatedArticle.body,
    updatedBody,
  );
  TestValidator.equals(
    "updated summary matches",
    updatedArticle.summary,
    updatedSummary,
  );
  TestValidator.equals(
    "updated category count",
    updatedArticle.categories.length,
    1,
  );
  TestValidator.equals(
    "updated category ID",
    updatedArticle.categories[0].id,
    category2.id,
  );

  // Step 6: Verify timestamp behavior
  TestValidator.equals(
    "created_at unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedArticle.updated_at,
    originalUpdatedAt,
  );

  // Verify article ID remains the same
  TestValidator.equals("article ID unchanged", updatedArticle.id, article.id);

  // Verify author remains the same
  TestValidator.equals(
    "author ID unchanged",
    updatedArticle.author.id,
    member.id,
  );
}
