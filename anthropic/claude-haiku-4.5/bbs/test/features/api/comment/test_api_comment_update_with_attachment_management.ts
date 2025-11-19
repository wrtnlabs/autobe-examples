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
 * Test updating comment while adding image attachments atomically.
 *
 * This test validates that attachments can be created together with comment
 * content updates in a single atomic transaction. The scenario demonstrates the
 * complete workflow of creating a contributor, publishing an article, posting
 * an initial comment, and then updating that comment with new content while
 * adding image attachments (JPG/PNG formats, under 5MB each).
 *
 * Workflow:
 *
 * 1. Create a contributor account and authenticate
 * 2. Create an article draft
 * 3. Approve and publish the article using moderator account
 * 4. Post initial comment without attachments
 * 5. Update the comment with new content AND add 1-2 image attachments
 * 6. Verify the response includes updated comment with all attachment metadata
 */
export async function test_api_comment_update_with_attachment_management(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(10),
      password: "SecurePass123!",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create an article draft
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "https://example.com/create-article",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals("article status is draft", article.status, "draft");

  // Step 3: Create moderator and approve article
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Approve the article
  const approvedArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Good article content",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);
  TestValidator.equals(
    "article status is published",
    approvedArticle.status,
    "published",
  );

  // Step 4: Switch back to contributor and post initial comment
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "SecurePass123!",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  const initialComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);
  TestValidator.equals(
    "initial comment has no attachments",
    initialComment.attachments.length,
    0,
  );

  // Step 5: Update the comment with new content AND add image attachments
  const updatedComment =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          attachments: [
            {
              original_file_name: "image1.jpg",
              file_type: "jpg",
              file_size: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<5242880>
              >(),
              mime_type: "image/jpeg",
              display_url: "https://example.com/images/image1.jpg",
            } satisfies IDiscussionBoardCommentAttachment.ICreate,
            {
              original_file_name: "image2.png",
              file_type: "png",
              file_size: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<5242880>
              >(),
              mime_type: "image/png",
              display_url: "https://example.com/images/image2.png",
            } satisfies IDiscussionBoardCommentAttachment.ICreate,
          ],
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Step 6: Verify the updated comment response
  TestValidator.predicate(
    "comment content is updated",
    updatedComment.content !== initialComment.content,
  );
  TestValidator.equals(
    "attachments count is 2",
    updatedComment.attachments.length,
    2,
  );

  // Verify attachment structure and metadata
  for (const attachment of updatedComment.attachments) {
    typia.assert<IDiscussionBoardCommentAttachment>(attachment);
    TestValidator.predicate("attachment has id", attachment.id.length > 0);
    TestValidator.predicate(
      "attachment has original_file_name",
      attachment.original_file_name.length > 0,
    );
    TestValidator.predicate(
      "attachment has valid file_type",
      ["jpg", "jpeg", "png", "gif"].includes(attachment.file_type),
    );
    TestValidator.predicate(
      "attachment has valid file_size",
      attachment.file_size > 0 && attachment.file_size <= 5242880,
    );
    TestValidator.predicate(
      "attachment has valid mime_type",
      ["image/jpeg", "image/png", "image/gif"].includes(attachment.mime_type),
    );
    TestValidator.predicate(
      "attachment has display_url",
      attachment.display_url.includes("http"),
    );
  }

  TestValidator.equals(
    "first attachment is jpg",
    updatedComment.attachments[0].file_type,
    "jpg",
  );
  TestValidator.equals(
    "second attachment is png",
    updatedComment.attachments[1].file_type,
    "png",
  );
}
