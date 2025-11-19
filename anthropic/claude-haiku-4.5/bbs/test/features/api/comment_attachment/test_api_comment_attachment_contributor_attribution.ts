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
 * Test that attachments are correctly attributed to the uploading contributor.
 *
 * This test validates the complete attachment lifecycle including contributor
 * attribution. It ensures that when a contributor uploads an attachment to a
 * comment, the system properly tracks and returns the contributor's identity
 * information (ID and username) in the attachment response.
 *
 * Process:
 *
 * 1. Register a contributor account
 * 2. Create a discussion board article
 * 3. Create a comment on the article
 * 4. Upload an attachment to the comment with proper metadata
 * 5. Verify the attachment response includes complete contributor attribution
 * 6. Validate that the author field contains the uploader's ID and username
 */
export async function test_api_comment_attachment_contributor_attribution(
  connection: api.IConnection,
) {
  // Step 1: Register contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        password: "SecurePass123!@#",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor account created with active status",
    contributor.account_status,
    "active",
  );

  // Step 2: Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article author matches contributor",
    article.author.id,
    contributor.id,
  );

  // Step 3: Create a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment author matches contributor",
    comment.author.id,
    contributor.id,
  );

  // Step 4: Upload attachment to the comment
  const attachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test_image.png",
          file_type: "png",
          file_size: 12345,
          mime_type: "image/png",
          display_url: "http://localhost:3000/storage/test_image.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 5 & 6: Verify attachment includes complete contributor attribution
  TestValidator.equals(
    "attachment author ID matches contributor ID",
    attachment.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "attachment author username matches contributor username",
    attachment.author.username,
    contributor.username,
  );
  TestValidator.equals(
    "attachment belongs to correct comment",
    attachment.comment.id,
    comment.id,
  );
  TestValidator.predicate(
    "attachment upload timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(attachment.uploaded_at),
  );
  TestValidator.equals(
    "attachment file type matches uploaded file",
    attachment.file_type,
    "png",
  );
  TestValidator.equals(
    "attachment mime type is correct",
    attachment.mime_type,
    "image/png",
  );
  TestValidator.equals(
    "attachment display URL is preserved",
    attachment.display_url,
    "http://localhost:3000/storage/test_image.png",
  );
}
