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
 * Test that image attachments respect the 5MB size limit per file.
 *
 * This test validates the comment attachment size limit enforcement by:
 *
 * 1. Authenticating as a contributor
 * 2. Creating a discussion board article
 * 3. Creating a comment on the article
 * 4. Attempting to upload an oversized image (exceeds 5MB limit)
 * 5. Verifying that the upload fails with validation error
 * 6. Uploading a valid image within the 5MB limit
 * 7. Verifying successful attachment creation
 */
export async function test_api_comment_attachment_size_limit_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as contributor
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create an article
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Comment Attachment",
          content: RandomGenerator.content({ paragraphs: 3 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Create a comment on the article
  const comment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "Test comment for attachment size limit testing",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Attempt to upload an oversized image (exceeds 5MB limit)
  await TestValidator.error(
    "should reject image attachment exceeding 5MB size limit",
    async () => {
      // Create a file size that exceeds 5MB (5,242,880 bytes)
      const oversizedFileSize = 5242881; // 1 byte over 5MB limit

      await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            original_file_name: "oversized-image.jpg",
            file_type: "jpg",
            file_size: oversizedFileSize,
            mime_type: "image/jpeg",
            display_url: "http://localhost:3000/uploads/oversized-image.jpg",
          } satisfies IDiscussionBoardCommentAttachment.ICreate,
        },
      );
    },
  );

  // Step 5: Upload a valid image within the 5MB limit
  const validFileSize = 2097152; // 2MB, well within 5MB limit
  const validAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "valid-image.jpg",
          file_type: "jpg",
          file_size: validFileSize,
          mime_type: "image/jpeg",
          display_url: "http://localhost:3000/uploads/valid-image.jpg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(validAttachment);

  // Step 6: Validate successful attachment
  TestValidator.equals(
    "valid attachment file size matches request",
    validAttachment.file_size,
    validFileSize,
  );
  TestValidator.equals(
    "valid attachment file type is jpg",
    validAttachment.file_type,
    "jpg",
  );
  TestValidator.predicate(
    "valid attachment has valid display URL",
    validAttachment.display_url.length > 0,
  );

  // Step 7: Test edge case - exactly at 5MB limit (should succeed)
  const edgeCaseFileSize = 5242880; // Exactly 5MB
  const edgeCaseAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "edge-case-image.png",
          file_type: "png",
          file_size: edgeCaseFileSize,
          mime_type: "image/png",
          display_url: "http://localhost:3000/uploads/edge-case-image.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(edgeCaseAttachment);

  TestValidator.equals(
    "edge case attachment at exactly 5MB limit succeeds",
    edgeCaseAttachment.file_size,
    edgeCaseFileSize,
  );
}
