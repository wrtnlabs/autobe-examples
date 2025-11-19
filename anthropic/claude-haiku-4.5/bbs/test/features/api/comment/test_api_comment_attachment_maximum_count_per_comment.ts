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
 * Test the maximum attachment limit of 2 images per comment.
 *
 * Validates that a comment can successfully store and return 2 image
 * attachments with complete metadata, and that the system properly rejects
 * attempts to exceed this limit. This ensures the business rule preventing
 * excessive media bloat is enforced while allowing meaningful visual context
 * for discussion contributions.
 *
 * Test workflow:
 *
 * 1. Register a contributor account
 * 2. Create an article to host comments
 * 3. Create a comment on the article
 * 4. Successfully attach 2 images to the comment
 * 5. Verify both attachments with complete metadata
 * 6. Attempt to attach a third image and verify rejection
 */
export async function test_api_comment_attachment_maximum_count_per_comment(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor registered successfully",
    () => !!contributor.id,
  );

  // Step 2: Create an article to host comments
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created successfully", () => !!article.id);

  // Step 3: Create a comment on the article
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
  TestValidator.predicate("comment created successfully", () => !!comment.id);

  // Step 4: Successfully attach first image to the comment
  const attachment1: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "image1.jpg",
          file_type: "jpg",
          file_size: 1024000,
          mime_type: "image/jpeg",
          display_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  TestValidator.predicate(
    "first attachment created successfully",
    () => !!attachment1.id,
  );
  TestValidator.equals(
    "first attachment filename matches",
    attachment1.original_file_name,
    "image1.jpg",
  );

  // Step 5: Successfully attach second image to the comment
  const attachment2: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "image2.png",
          file_type: "png",
          file_size: 2048000,
          mime_type: "image/png",
          display_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  TestValidator.predicate(
    "second attachment created successfully",
    () => !!attachment2.id,
  );
  TestValidator.equals(
    "second attachment filename matches",
    attachment2.original_file_name,
    "image2.png",
  );

  // Step 6: Verify both attachments are stored with complete metadata
  TestValidator.equals(
    "first attachment has ID",
    attachment1.id !== null && attachment1.id !== undefined,
    true,
  );
  TestValidator.equals(
    "first attachment file type matches",
    attachment1.file_type,
    "jpg",
  );
  TestValidator.equals(
    "first attachment MIME type matches",
    attachment1.mime_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "second attachment has ID",
    attachment2.id !== null && attachment2.id !== undefined,
    true,
  );
  TestValidator.equals(
    "second attachment file type matches",
    attachment2.file_type,
    "png",
  );
  TestValidator.equals(
    "second attachment MIME type matches",
    attachment2.mime_type,
    "image/png",
  );

  // Step 7: Attempt to attach a third image and verify rejection
  await TestValidator.error(
    "third attachment should be rejected due to maximum limit",
    async () => {
      await api.functional.discussionBoard.articles.comments.attachments.create(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            original_file_name: "image3.gif",
            file_type: "gif",
            file_size: 512000,
            mime_type: "image/gif",
            display_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardCommentAttachment.ICreate,
        },
      );
    },
  );
}
