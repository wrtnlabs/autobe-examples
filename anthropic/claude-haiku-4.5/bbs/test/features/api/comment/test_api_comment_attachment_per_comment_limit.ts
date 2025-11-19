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
 * Validates the comment attachment limit enforcement.
 *
 * Tests that each comment can have a maximum of 2 image attachments. The test
 * creates a contributor account, article, and comment, then:
 *
 * 1. Uploads first image attachment successfully
 * 2. Uploads second image attachment successfully
 * 3. Attempts to upload a third image and verifies it fails
 *
 * This ensures the system properly enforces the attachment limit to prevent
 * excessive media bloat while allowing meaningful visual context.
 */
export async function test_api_comment_attachment_per_comment_limit(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "SecurePassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate("contributor created", contributor.id !== null);

  // Step 2: Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created", article.id !== null);

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
  TestValidator.predicate("comment created", comment.id !== null);

  // Step 4: Upload first image attachment successfully
  const firstAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test-image-1.png",
          file_type: "png",
          file_size: 5000,
          mime_type: "image/png",
          display_url: "http://localhost:3000/attachments/image-1.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(firstAttachment);
  TestValidator.predicate(
    "first attachment created",
    firstAttachment.id !== null,
  );

  // Step 5: Upload second image attachment successfully
  const secondAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test-image-2.jpg",
          file_type: "jpg",
          file_size: 4500,
          mime_type: "image/jpeg",
          display_url: "http://localhost:3000/attachments/image-2.jpg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(secondAttachment);
  TestValidator.predicate(
    "second attachment created",
    secondAttachment.id !== null,
  );

  // Step 6: Attempt to upload third image attachment and verify it fails
  await TestValidator.error(
    "third attachment should fail due to limit",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            original_file_name: "test-image-3.gif",
            file_type: "gif",
            file_size: 3000,
            mime_type: "image/gif",
            display_url: "http://localhost:3000/attachments/image-3.gif",
          } satisfies IDiscussionBoardCommentAttachment.ICreate,
        },
      );
    },
  );
}
