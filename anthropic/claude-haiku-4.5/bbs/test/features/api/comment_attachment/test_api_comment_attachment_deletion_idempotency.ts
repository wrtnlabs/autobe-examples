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
 * Test behavior when attempting to delete the same attachment multiple times.
 *
 * Create an attachment and delete it successfully. Then attempt to delete the
 * same attachment ID again and verify the system returns a 404 Not Found error.
 * This validates that deleted attachments are properly removed and cannot be
 * deleted again (hard delete behavior, not idempotent).
 *
 * **Test Steps:**
 *
 * 1. Register contributor account
 * 2. Create article draft
 * 3. Create comment on article
 * 4. Create attachment for comment
 * 5. Delete attachment successfully
 * 6. Attempt to delete same attachment again and verify 404 error
 */
export async function test_api_comment_attachment_deletion_idempotency(
  connection: api.IConnection,
) {
  // 1. Register contributor for idempotency testing
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create article for comment context
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Create comment for attachment
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Create attachment for deletion testing
  const attachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test_image.png",
          file_type: "png",
          file_size: 1024,
          mime_type: "image/png",
          display_url: "https://example.com/images/test_image.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 5. Delete attachment successfully (first deletion)
  await api.functional.discussionBoard.articles.comments.attachments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  // 6. Attempt to delete same attachment again and verify 404 error
  await TestValidator.error(
    "deleting already-deleted attachment should fail with 404",
    async () => {
      await api.functional.discussionBoard.articles.comments.attachments.erase(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
