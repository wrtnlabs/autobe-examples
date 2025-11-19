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
 * Test adding a single image attachment to an existing comment.
 *
 * A contributor creates a comment on an article, then uploads a single image
 * attachment (JPG format) with size not exceeding 5MB. The test verifies that
 * the attachment UUID is generated, file metadata is recorded correctly
 * (original filename, file type, size, MIME type, upload timestamp), and the
 * display_url is returned. The test validates that the attachment is properly
 * linked to the comment and visible in comment details.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account
 * 2. Create an article in draft status
 * 3. Create a comment on the article
 * 4. Upload a single JPG image attachment to the comment
 * 5. Verify attachment metadata and linking to the comment
 */
export async function test_api_comment_attachment_creation_single_file(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributorEmail = `contributor_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const contributorUsername = `contributor_${RandomGenerator.alphaNumeric(8)}`;
  const contributorPassword = `Pass${RandomGenerator.alphaNumeric(4)}@123`;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: contributorUsername,
        password: contributorPassword,
        href: "http://localhost:3000/auth/contributor/join",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article draft with required fields
  const articleTitle = `Article ${RandomGenerator.alphaNumeric(8)}`;
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals("article status is draft", article.status, "draft");

  // Step 3: Create a comment on the article
  const commentContent = `Comment with attachment: ${RandomGenerator.paragraph({
    sentences: 3,
  })}`;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );

  // Step 4: Upload a single JPG image attachment to the comment
  const originalFileName = `test_image_${RandomGenerator.alphaNumeric(8)}.jpg`;
  const fileSizeBytes = Math.floor(Math.random() * 1024 * 1024) + 10240; // 10KB to 1MB
  const mimeType = "image/jpeg";
  const displayUrl = `http://localhost:3000/attachments/${RandomGenerator.alphaNumeric(
    16,
  )}.jpg`;

  const attachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: originalFileName,
          file_type: "jpg",
          file_size: fileSizeBytes,
          mime_type: mimeType,
          display_url: displayUrl,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 5: Verify attachment metadata and properties
  TestValidator.equals(
    "attachment file name matches",
    attachment.original_file_name,
    originalFileName,
  );
  TestValidator.equals(
    "attachment file type is jpg",
    attachment.file_type,
    "jpg",
  );
  TestValidator.equals(
    "attachment file size matches",
    attachment.file_size,
    fileSizeBytes,
  );
  TestValidator.equals(
    "attachment MIME type is image/jpeg",
    attachment.mime_type,
    mimeType,
  );
  TestValidator.equals(
    "attachment display URL matches",
    attachment.display_url,
    displayUrl,
  );
  TestValidator.predicate(
    "attachment has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      attachment.id,
    ),
  );
  TestValidator.predicate(
    "attachment upload timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(attachment.uploaded_at),
  );

  // Verify attachment author information
  TestValidator.equals(
    "attachment author ID matches contributor",
    attachment.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "attachment author username matches",
    attachment.author.username,
    contributor.username,
  );

  // Verify attachment is linked to the correct comment
  TestValidator.equals(
    "attachment is linked to comment",
    attachment.comment.id,
    comment.id,
  );
}
