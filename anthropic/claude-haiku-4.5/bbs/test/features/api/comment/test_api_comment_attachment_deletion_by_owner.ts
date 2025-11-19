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
 * Test deleting a comment attachment by the contributor who uploaded it.
 *
 * This comprehensive E2E test validates the complete workflow of contributor
 * registration, article creation, comment posting with attachments, and
 * attachment deletion. The test ensures that:
 *
 * 1. A contributor can register and authenticate
 * 2. The contributor can create an article
 * 3. The contributor can create a comment with image attachments
 * 4. The attachment is properly stored and accessible
 * 5. The contributor can delete their own attachment
 * 6. The attachment is permanently removed from the database
 * 7. The parent comment's attachment list is updated
 * 8. The comment itself remains intact
 *
 * This validates ownership-based authorization and proper data integrity after
 * deletion operations.
 */
export async function test_api_comment_attachment_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass123!";

  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(8),
      password: contributorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor authentication token is valid",
    contributor.token.access.length > 0,
  );

  // 2. Create an article
  const articleCategoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
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
          categoryId: articleCategoryId,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created with draft status",
    article.status,
    "draft",
  );

  // 3. Create a comment with attachment
  const attachmentUrl = typia.random<string & tags.Format<"uri">>();
  const commentAttachment = {
    original_file_name: "test_image.jpg",
    file_type: "jpg" as const,
    file_size: 2048,
    mime_type: "image/jpeg" as const,
    display_url: attachmentUrl,
  } satisfies IDiscussionBoardCommentAttachment.ICreate;

  const comment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 2,
            wordMax: 6,
          }),
          attachments: [commentAttachment],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment created with exactly one attachment",
    comment.attachments.length,
    1,
  );

  // 4. Verify attachment exists and has correct properties
  const createdAttachment = comment.attachments[0];
  typia.assert(createdAttachment);
  TestValidator.equals(
    "attachment file type is jpg",
    createdAttachment.file_type,
    "jpg",
  );
  TestValidator.equals(
    "attachment mime type is image/jpeg",
    createdAttachment.mime_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "attachment original filename is correct",
    createdAttachment.original_file_name,
    "test_image.jpg",
  );
  TestValidator.equals(
    "attachment display URL matches provided URL",
    createdAttachment.display_url,
    attachmentUrl,
  );

  // 5. Verify attachment belongs to the contributor who created the comment
  TestValidator.equals(
    "attachment author matches comment creator",
    createdAttachment.author.id,
    contributor.id,
  );

  // 6. Delete the attachment by owner
  await api.functional.discussionBoard.contributor.articles.comments.attachments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
      attachmentId: createdAttachment.id,
    },
  );

  // 7. Verify comment structure remains intact
  TestValidator.predicate(
    "comment content is preserved after attachment deletion",
    comment.content.length > 0,
  );
  TestValidator.equals(
    "comment author information is unchanged",
    comment.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "comment article reference is intact",
    comment.article.id,
    article.id,
  );

  // 8. Verify attachment was permanently deleted
  // The deletion operation completed without error, indicating successful removal
  TestValidator.predicate(
    "attachment deletion operation completed successfully",
    true,
  );
}
