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
 * Test successful creation of an image attachment for a discussion board
 * comment.
 *
 * A contributor creates an article, posts a comment on it, and uploads a JPG
 * image attachment to the comment. The test validates the complete workflow
 * from contributor registration through comment creation to successful image
 * attachment creation.
 *
 * Validates:
 *
 * 1. Contributor account creation with authentication
 * 2. Article creation with title, content, and category selection
 * 3. Comment creation on the published article
 * 4. Image attachment creation with JPG format, proper MIME type, and file size
 *    validation
 * 5. Response includes complete attachment metadata with UUID, filename, type,
 *    size, and display URL
 * 6. Attachment is properly linked to the parent comment
 */
export async function test_api_comment_attachment_image_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account with authentication
  const contributorEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const contributorUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const contributorPassword: string = "TestPass123!@#";

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: contributorUsername,
        password: contributorPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article for the comment
  const randomCategory = typia.random<string & tags.Format<"uuid">>();
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: randomCategory,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
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
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });
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
    "comment author matches contributor",
    comment.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "comment article matches created article",
    comment.article.id,
    article.id,
  );

  // Step 4: Create an image attachment for the comment
  const attachmentFilename =
    "test_image_" + RandomGenerator.alphaNumeric(8) + ".jpg";
  const attachmentFileSize = 2097152; // 2MB, within 5MB limit
  const attachmentDisplayUrl =
    "http://localhost:3000/attachments/" +
    RandomGenerator.alphaNumeric(16) +
    ".jpg";

  const attachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: attachmentFilename,
          file_type: "jpg",
          file_size: attachmentFileSize,
          mime_type: "image/jpeg",
          display_url: attachmentDisplayUrl,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 5: Validate attachment metadata and relationships
  TestValidator.equals(
    "attachment filename matches input",
    attachment.original_file_name,
    attachmentFilename,
  );
  TestValidator.equals(
    "attachment file type is jpg",
    attachment.file_type,
    "jpg",
  );
  TestValidator.equals(
    "attachment file size matches input",
    attachment.file_size,
    attachmentFileSize,
  );
  TestValidator.equals(
    "attachment MIME type is image/jpeg",
    attachment.mime_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "attachment display URL matches input",
    attachment.display_url,
    attachmentDisplayUrl,
  );
  TestValidator.equals(
    "attachment author matches contributor",
    attachment.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "attachment is linked to correct comment",
    attachment.comment.id,
    comment.id,
  );
  TestValidator.predicate(
    "attachment has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      attachment.id,
    ),
  );
  TestValidator.predicate(
    "attachment has valid upload timestamp",
    new Date(attachment.uploaded_at) instanceof Date &&
      !isNaN(new Date(attachment.uploaded_at).getTime()),
  );
}
