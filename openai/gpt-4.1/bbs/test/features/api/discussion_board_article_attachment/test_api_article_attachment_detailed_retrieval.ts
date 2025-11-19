import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";

export async function test_api_article_attachment_detailed_retrieval(
  connection: api.IConnection,
) {
  // 1. Retrieve using valid articleId and attachmentId
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const attachmentId = typia.random<string & tags.Format<"uuid">>();
  const attachment =
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId,
      attachmentId,
    });
  typia.assert(attachment);
  TestValidator.equals(
    "attachment.article_id matches input",
    attachment.article_id,
    articleId,
  );
  TestValidator.equals(
    "attachment.id matches input",
    attachment.id,
    attachmentId,
  );
  TestValidator.predicate(
    "file_name is non-empty",
    attachment.file_name.length > 0,
  );
  TestValidator.predicate(
    "mime_type is non-empty",
    attachment.mime_type.length > 0,
  );
  TestValidator.predicate("file_size is positive", attachment.file_size > 0);
  TestValidator.predicate(
    "file_uri is non-empty",
    attachment.file_uri.length > 0,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof attachment.created_at === "string" &&
      attachment.created_at.length > 0,
  );
  // deleted_at is nullable/undefinable; if present, should be string
  if (attachment.deleted_at !== null && attachment.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO string",
      typeof attachment.deleted_at === "string",
    );
  }

  // 2. Retrieval with invalid (non-existent) articleId
  await TestValidator.error("invalid articleId should fail", async () => {
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId: typia.random<string & tags.Format<"uuid">>(), // likely unrelated
      attachmentId,
    });
  });

  // 3. Retrieval with invalid (non-existent) attachmentId
  await TestValidator.error("invalid attachmentId should fail", async () => {
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId,
      attachmentId: typia.random<string & tags.Format<"uuid">>(), // unrelated UUID
    });
  });

  // 4. Retrieval with completely random pairs
  await TestValidator.error("completely random IDs should fail", async () => {
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId: typia.random<string & tags.Format<"uuid">>(),
      attachmentId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
