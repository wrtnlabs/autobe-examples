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
 * Test that updating a soft-deleted comment is properly handled.
 *
 * This test validates the discussion board system's handling of update
 * operations on deleted comments. It ensures that once a comment is
 * soft-deleted, subsequent update attempts are rejected with appropriate error
 * responses (404 or 403).
 *
 * The test follows this workflow:
 *
 * 1. Create a contributor account
 * 2. Create and publish a discussion board article
 * 3. Post a comment on the article
 * 4. Soft-delete the comment
 * 5. Attempt to update the deleted comment
 * 6. Verify that the update fails with 404 or 403 error
 *
 * This ensures data integrity and prevents manipulation of deleted content.
 */
export async function test_api_comment_update_deleted_comment(
  connection: api.IConnection,
) {
  // 1. Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "http://localhost/register",
        referrer: "http://localhost/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create and publish article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
    href: "http://localhost/articles/create",
    referrer: "http://localhost/",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      { body: articleData },
    );
  typia.assert(article);

  // Create and authenticate moderator to approve article
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "ModPassword123!",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Approve the article
  const approvedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Approved for testing",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);

  // Switch back to contributor for posting comment
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "TestPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // 3. Post a comment
  const commentData = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);
  TestValidator.predicate(
    "comment should not be deleted initially",
    !comment.is_deleted,
  );

  // 4. Delete the comment (soft delete)
  const deletedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);
  TestValidator.predicate(
    "comment should be marked as deleted",
    deletedComment.is_deleted,
  );
  TestValidator.predicate(
    "comment should have deleted_at timestamp",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );

  // 5. Attempt to update the deleted comment
  const updateData = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardComment.IUpdate;

  await TestValidator.error(
    "updating deleted comment should fail with 404 or 403 error",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: updateData,
        },
      );
    },
  );
}
