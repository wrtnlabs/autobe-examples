import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";

/**
 * Test retrieving a soft-deleted article attachment by detail endpoint.
 *
 * - Attempt to access the detailed metadata for an attachment using random IDs
 *   simulating a deleted record.
 * - Expect the API to deny access or return an error (not found/forbidden), not
 *   to expose the attachment's metadata.
 * - This test ensures that the business logic for soft deletion (deleted_at set)
 *   is enforced and deleted attachments are not ever retrievable via detail
 *   endpoint for normal user and moderation audit.
 */
export async function test_api_article_attachment_deleted_access_attempt(
  connection: api.IConnection,
) {
  // Generate random UUIDs as stand-in for existing soft-deleted attachment
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const attachmentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the attachment (should fail with error)
  await TestValidator.error(
    "should deny access to soft-deleted attachment",
    async () => {
      await api.functional.discussionBoard.articles.attachments.at(connection, {
        articleId,
        attachmentId,
      });
    },
  );
}
