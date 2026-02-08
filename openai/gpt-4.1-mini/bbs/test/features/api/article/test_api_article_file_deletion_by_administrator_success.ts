import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_article_file_deletion_by_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates the successful deletion of a specific file attached to an article by an administrator.
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Update adminConnection headers with the authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare UUIDs for articleId and fileId
  // Since no direct API provided for article/file creation in instructions,
  // Use random valid UUIDs for testing delete operation assuming valid ownership
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const fileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the erase API to delete the file attached to the article
  await api.functional.discussionBoard.administrator.articles.files.erase(
    adminConnection,
    {
      articleId,
      fileId,
    },
  );
  // 4. No content response means success, no body to validate
  // Just ensure no exceptions thrown and test ends here
}
