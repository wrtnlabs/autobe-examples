import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Validate that an administrator can delete any article's attachment,
 * regardless of original ownership.
 *
 * 1. Register as a new admin via the admin join endpoint (with random but valid
 *    credentials and audit session params)
 * 2. (Simulate) Prepare random articleId and attachmentId (since no creation
 *    endpoint is available)
 * 3. Call admin attachment erase endpoint, attempting to delete the attachment
 *    from the article
 * 4. Assert no errors occur (permission granted by admin role)
 */
export async function test_api_article_attachment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + ``,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Prepare random articleId and attachmentId (simulate)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const attachmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete the attachment as admin
  await api.functional.discussionBoard.admin.articles.attachments.erase(
    connection,
    {
      articleId,
      attachmentId,
    },
  );
  // 4. If no error is thrown, admin deletion override is confirmed; no further access is possible as there are no retrieval endpoints available in the current API imports.
}
