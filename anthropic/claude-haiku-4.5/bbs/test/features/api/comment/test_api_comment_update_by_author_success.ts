import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful update of comment by the original author.
 *
 * This test validates the core edit workflow for contributors updating their
 * own comments. The scenario follows a complete user journey:
 *
 * 1. Create and authenticate a contributor account
 * 2. Create an article draft as the contributor
 * 3. Create and authenticate a moderator account
 * 4. Have the moderator approve and publish the article
 * 5. Switch back to contributor context
 * 6. Post an initial comment with content "Initial comment"
 * 7. Update the comment with new content "Updated comment content"
 * 8. Verify HTTP 200 response with updated comment containing:
 *
 *    - New content matching the update
 *    - Recent updated_at timestamp showing modification
 *    - Edit_count = 1 indicating one edit
 *    - All original metadata preserved (id, article reference, author info)
 *
 * This validates that authors can successfully modify comment content within
 * allowed timeframe and that the system tracks modification history properly.
 */
export async function test_api_comment_update_by_author_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass123!";
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: contributorPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor email should match",
    contributor.email,
    contributorEmail,
  );

  // Step 2: Create article draft as contributor
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const initialArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000/dashboard",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(initialArticle);
  TestValidator.equals(
    "article status should be draft",
    initialArticle.status,
    "draft",
  );

  // Step 3: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(12),
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Moderator approves and publishes the article
  const approvedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: initialArticle.id,
        body: {
          approvalNotes: "Article looks good for publication",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);
  TestValidator.equals(
    "article status should be published",
    approvedArticle.status,
    "published",
  );

  // Step 5: Switch back to contributor context by logging in
  const contributorLogin: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.login(connection, {
      body: {
        email: contributorEmail,
        password: contributorPassword,
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ILogin,
    });
  typia.assert(contributorLogin);

  // Step 6: Post initial comment with specific content
  const initialCommentContent = "Initial comment";
  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: approvedArticle.id,
        body: {
          content: initialCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(createdComment);
  TestValidator.equals(
    "initial comment content",
    createdComment.content,
    initialCommentContent,
  );
  TestValidator.equals(
    "initial edit_count should be 0",
    createdComment.edit_count,
    0,
  );

  // Step 7: Update the comment with new content
  const updatedCommentContent = "Updated comment content";
  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: approvedArticle.id,
        commentId: createdComment.id,
        body: {
          content: updatedCommentContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );

  // Step 8: Verify response with updated comment
  typia.assert(updatedComment);
  TestValidator.equals(
    "updated comment content should match",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.equals(
    "updated_at should be after created_at",
    updatedComment.updated_at > createdComment.created_at,
    true,
  );
  TestValidator.equals(
    "edit_count should be 1 after first edit",
    updatedComment.edit_count,
    1,
  );
  TestValidator.equals(
    "comment ID should remain the same",
    updatedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "article ID reference should remain the same",
    updatedComment.article.id,
    approvedArticle.id,
  );
  TestValidator.equals(
    "author reference should remain the same",
    updatedComment.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "is_deleted should still be false",
    updatedComment.is_deleted,
    false,
  );
}
