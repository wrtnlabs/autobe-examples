import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test deletion of attachment from a non-existent comment.
 *
 * This test validates that the API properly enforces referential integrity when
 * attempting to delete an attachment from a comment that doesn't exist. The
 * system should reject the deletion operation because the comment ID doesn't
 * correspond to any actual comment in the database.
 *
 * Workflow:
 *
 * 1. Register a contributor for authentication context
 * 2. Create an article to have valid article context
 * 3. Generate a non-existent comment ID (random UUID)
 * 4. Generate a non-existent attachment ID (random UUID)
 * 5. Attempt to delete the attachment from the non-existent comment
 * 6. Verify the system properly rejects this operation with an error
 */
export async function test_api_comment_attachment_deletion_invalid_comment_id(
  connection: api.IConnection,
) {
  // 1. Register contributor
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // 2. Create article
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
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3-4. Generate non-existent IDs
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();
  const invalidAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 5-6. Attempt to delete attachment from non-existent comment
  await TestValidator.error(
    "should reject deletion of attachment from non-existent comment",
    async () => {
      await api.functional.discussionBoard.articles.comments.attachments.erase(
        connection,
        {
          articleId: article.id,
          commentId: invalidCommentId,
          attachmentId: invalidAttachmentId,
        },
      );
    },
  );
}
