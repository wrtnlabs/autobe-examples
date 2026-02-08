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

export async function test_api_article_file_deletion_file_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(administrator);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${administrator.token.access}`,
  };
  // Use valid but random articleId and invalid fileId
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const fileId = typia.random<string & tags.Format<"uuid">>();
  // Attempt deletion expecting an error (file not found)
  await TestValidator.httpError(
    "delete article file with non-existent fileId should fail",
    [400, 404],
    async () => {
      await api.functional.discussionBoard.administrator.articles.files.erase(
        adminConnection,
        {
          articleId,
          fileId,
        },
      );
    },
  );
}
