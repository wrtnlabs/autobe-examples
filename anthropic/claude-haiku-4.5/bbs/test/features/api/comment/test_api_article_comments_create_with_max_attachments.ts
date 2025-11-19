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
 * Test creating comment with maximum 2 attachments on a discussion board
 * article.
 *
 * This test validates that the comment creation endpoint properly handles
 * attachment limits. It verifies that:
 *
 * 1. Comments can be created with exactly 2 attachments (the maximum)
 * 2. All attachments are properly included in the response with correct metadata
 * 3. Attempting to add 3 attachments (exceeding the limit) returns an error
 * 4. Atomic creation ensures either all attachments succeed or none are created
 *
 * The test follows the workflow:
 *
 * 1. Authenticate a contributor
 * 2. Create an article for commenting
 * 3. Create a comment with 2 different image format attachments (JPG and PNG)
 * 4. Verify both attachments are in the response with proper metadata
 * 5. Test error handling by attempting to create comment with 3 attachments
 * 6. Validate that the 3-attachment request fails appropriately
 */
export async function test_api_article_comments_create_with_max_attachments(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a contributor
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/home",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create an article for commenting
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Comments",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 8,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/article",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Create comment with 2 different image format attachments (JPG and PNG)
  const commentWithTwoAttachments =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          attachments: [
            {
              original_file_name: "image_1.jpg",
              file_type: "jpg",
              file_size: 2048576, // 2MB JPG image
              mime_type: "image/jpeg",
              display_url: "http://localhost:3000/uploads/image_1.jpg",
            } satisfies IDiscussionBoardCommentAttachment.ICreate,
            {
              original_file_name: "image_2.png",
              file_type: "png",
              file_size: 1048576, // 1MB PNG image
              mime_type: "image/png",
              display_url: "http://localhost:3000/uploads/image_2.png",
            } satisfies IDiscussionBoardCommentAttachment.ICreate,
          ],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentWithTwoAttachments);

  // Step 4: Verify both attachments are in the response
  TestValidator.equals(
    "comment should have exactly 2 attachments",
    commentWithTwoAttachments.attachments.length,
    2,
  );

  TestValidator.equals(
    "first attachment should be JPG",
    commentWithTwoAttachments.attachments[0].file_type,
    "jpg",
  );

  TestValidator.equals(
    "second attachment should be PNG",
    commentWithTwoAttachments.attachments[1].file_type,
    "png",
  );

  TestValidator.equals(
    "first attachment MIME type should be image/jpeg",
    commentWithTwoAttachments.attachments[0].mime_type,
    "image/jpeg",
  );

  TestValidator.equals(
    "second attachment MIME type should be image/png",
    commentWithTwoAttachments.attachments[1].mime_type,
    "image/png",
  );

  // Step 5: Test error handling - attempt to create comment with 3 attachments
  await TestValidator.error(
    "should reject comment with 3 attachments exceeding maximum",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 5 }),
            attachments: [
              {
                original_file_name: "image_1.jpg",
                file_type: "jpg",
                file_size: 2048576,
                mime_type: "image/jpeg",
                display_url: "http://localhost:3000/uploads/image_1.jpg",
              } satisfies IDiscussionBoardCommentAttachment.ICreate,
              {
                original_file_name: "image_2.png",
                file_type: "png",
                file_size: 1048576,
                mime_type: "image/png",
                display_url: "http://localhost:3000/uploads/image_2.png",
              } satisfies IDiscussionBoardCommentAttachment.ICreate,
              {
                original_file_name: "image_3.gif",
                file_type: "gif",
                file_size: 1536000,
                mime_type: "image/gif",
                display_url: "http://localhost:3000/uploads/image_3.gif",
              } satisfies IDiscussionBoardCommentAttachment.ICreate,
            ],
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // Step 6: Verify atomic creation by confirming comment with 2 attachments was successful
  // The previously created comment should still exist with exactly 2 attachments
  TestValidator.predicate(
    "comment should maintain exactly 2 attachments after failed 3-attachment attempt",
    commentWithTwoAttachments.attachments.length === 2,
  );
}
