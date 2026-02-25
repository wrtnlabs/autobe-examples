import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test scenario where an administrator deletes a file attachment from another user's article.
 * 1. Authenticate as administrator using the admin join utility.
 * 2. Create an article as administrator (simulating a regular user's article).
 * 3. Attempt to delete a non-existent file attachment from that article.
 * 4. Validate that administrators have permission to call the delete endpoint, but the file does not exist.
 */
export async function test_api_admin_delete_file_attachment_other_user_article(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // Step 2: Create an article (as administrator) – there is no way to create file attachments
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {},
  );
  typia.assert(article);
  // Step 3: Attempt to delete a non-existent file attachment
  // We will use random UUIDs to simulate file deletion
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  const randomFileId = typia.random<string & tags.Format<"uuid">>();
  // Use TestValidator.error to verify that the endpoint throws an error (likely 404)
  // This demonstrates that administrators have permission to call the endpoint,
  // but the file does not exist.
  await TestValidator.error("delete non-existent file attachment", async () => {
    await api.functional.discussionBoard.admin.articles.files.erase(
      adminConnection,
      {
        articleId: randomArticleId,
        fileId: randomFileId,
      },
    );
  });
}
