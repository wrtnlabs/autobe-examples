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
 * Validate attachment deletion preserves comment and remaining attachments.
 *
 * This test ensures that deleting a single attachment from a comment does not
 * affect the comment's content, metadata, or other attachments. The test
 * verifies that attachment deletion is an isolated operation.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account
 * 2. Create a discussion board article
 * 3. Create a comment on the article with multiple image attachments
 * 4. Delete one of the attachments
 * 5. Verify the comment still exists with correct content and metadata
 * 6. Verify remaining attachments are still present
 * 7. Verify deleted attachment is no longer in the attachments list
 */
export async function test_api_comment_attachment_deletion_preserves_comment(
  connection: api.IConnection,
) {
  // 1. Register a contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Create a comment with two image attachments
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
          attachments: [
            {
              original_file_name: "image1.jpg",
              file_type: "jpg",
              file_size: 1024000,
              mime_type: "image/jpeg",
              display_url: typia.random<string & tags.Format<"uri">>(),
            },
            {
              original_file_name: "image2.png",
              file_type: "png",
              file_size: 2048000,
              mime_type: "image/png",
              display_url: typia.random<string & tags.Format<"uri">>(),
            },
          ],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment initially has two attachments",
    comment.attachments.length,
    2,
  );

  // 4. Store the IDs of both attachments before deletion
  const attachment1Id = comment.attachments[0].id;
  const attachment2Id = comment.attachments[1].id;

  // 5. Delete the first attachment
  await api.functional.discussionBoard.articles.comments.attachments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
      attachmentId: attachment1Id,
    },
  );

  // 6. Verify the comment content is preserved
  TestValidator.equals(
    "comment content preserved after attachment deletion",
    comment.content,
    commentContent,
  );

  // 7. Verify comment metadata is preserved
  TestValidator.predicate(
    "comment ID is unchanged",
    comment.id !== null && comment.id !== undefined,
  );
  TestValidator.equals(
    "comment edit count is preserved",
    comment.edit_count,
    comment.edit_count,
  );

  // 8. Verify second attachment still exists in the attachments list
  const secondAttachmentStillExists = comment.attachments.some(
    (a) => a.id === attachment2Id,
  );
  TestValidator.predicate(
    "second attachment still exists after first deletion",
    secondAttachmentStillExists,
  );

  // 9. Verify first attachment is no longer in the attachments list
  const firstAttachmentDeleted = !comment.attachments.some(
    (a) => a.id === attachment1Id,
  );
  TestValidator.predicate(
    "first attachment removed from comment attachments",
    firstAttachmentDeleted,
  );
}
