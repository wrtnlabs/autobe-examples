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
 * Test member's ability to delete their own draft article before publication.
 *
 * This test validates that members have full control over their content
 * lifecycle including unpublished drafts. The scenario creates a category,
 * registers a member who saves an article as draft (status='draft'), then
 * authenticates as that member and deletes the draft article.
 *
 * The test verifies that:
 *
 * 1. Draft articles can be deleted just like published articles
 * 2. The soft deletion mechanism applies regardless of publication status
 * 3. The deleted_at timestamp is set correctly
 *
 * Steps:
 *
 * 1. Register moderator and create article category
 * 2. Register member account (the article author)
 * 3. Create draft article with status='draft'
 * 4. Delete the draft article as the author
 * 5. Verify soft deletion with deleted_at timestamp
 */
export async function test_api_article_deletion_by_author_draft(
  connection: api.IConnection,
) {
  // Step 1: Register moderator and create category
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for testing article deletion",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Register member account (the article author)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create draft article
  const draftArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 6,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(draftArticle);

  TestValidator.equals("article status is draft", draftArticle.status, "draft");
  TestValidator.equals(
    "article author matches member",
    draftArticle.author.id,
    member.id,
  );

  // Step 4: Delete the draft article
  const deletedArticle =
    await api.functional.discussionBoard.member.articles.erase(connection, {
      articleId: draftArticle.id,
    });
  typia.assert(deletedArticle);

  // Step 5: Verify soft deletion
  TestValidator.equals(
    "deleted article ID matches original",
    deletedArticle.id,
    draftArticle.id,
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );
  TestValidator.equals(
    "article status remains draft",
    deletedArticle.status,
    "draft",
  );
}
