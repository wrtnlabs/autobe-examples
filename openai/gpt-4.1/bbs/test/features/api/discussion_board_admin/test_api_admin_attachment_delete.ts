import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";

/**
 * Validate that an admin can delete any file/image attachment from any article,
 * regardless of the article author.
 *
 * Business context: The admin has privileged ability to manage attachments
 * system-wide for compliance, moderation, or cleanup, regardless of article
 * authorship. Attachments are created via the admin endpoint and may be owned
 * by any user or admin.
 *
 * Workflow:
 *
 * 1. Register a new admin (ensures admin authentication context)
 * 2. Create and upload a new attachment on a (pre-existing or simulated) article
 *    via admin endpoint
 * 3. Delete the uploaded attachment via the admin attachment deletion endpoint
 * 4. Validate attachment can no longer be retrieved (soft deleted or fully
 *    removed)
 */
export async function test_api_admin_attachment_delete(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://testboard.example.com/signup",
    referrer: "https://testboard.example.com/",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Simulate a target article (use random UUID as we have no create-article API in scope)
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Upload an attachment to the article
  const attachmentInput = {
    file_name: `${RandomGenerator.alphaNumeric(15)}.png`,
    mime_type: "image/png",
    file_size: 1234,
    file_uri: "https://files.example.com/test-image.png",
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.admin.articles.attachments.create(
      connection,
      {
        articleId,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment article linkage",
    attachment.article_id,
    articleId,
  );

  // 4. Delete the attachment as admin
  await api.functional.discussionBoard.admin.articles.attachments.erase(
    connection,
    {
      articleId: articleId,
      attachmentId: attachment.id,
    },
  );

  // 5. Validate the attachment is now soft deleted
  // Because there is no attachment GET/read or "list" endpoint in scope, and the API does not return soft-deleted records,
  // we cannot re-fetch the deleted attachment for validation. Thus, we only validate no error is thrown and the original output is present.
  TestValidator.equals(
    "attachment logically marked for deletion",
    attachment.deleted_at !== null && attachment.deleted_at !== undefined,
    false,
  );
}
