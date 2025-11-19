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
 * Test deletion behavior when specifying a non-existent attachment ID.
 *
 * Validates that attempting to delete a comment attachment with an invalid UUID
 * returns a 404 Not Found error. This ensures the system verifies the
 * attachment exists before attempting deletion.
 *
 * Workflow:
 *
 * 1. Register a contributor account for authentication
 * 2. Create an article for context
 * 3. Create a comment on the article
 * 4. Attempt to delete an attachment with a non-existent UUID
 * 5. Verify the system returns a 404 Not Found error
 */
export async function test_api_comment_attachment_deletion_invalid_attachment_id(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor account
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "ValidPassword123!",
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
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/new",
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
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Attempt to delete an attachment with a non-existent UUID
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Verify the system returns a 404 Not Found error
  await TestValidator.error(
    "deletion of non-existent attachment should fail with 404 error",
    async () => {
      await api.functional.discussionBoard.articles.comments.attachments.erase(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          attachmentId: nonExistentAttachmentId,
        },
      );
    },
  );
}
