import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_article_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Administrator connection setup
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
    },
  });
  typia.assert(authorizedAdmin);
  // Use adminConnection for subsequent requests
  // Generate a random UUID that presumably does not exist
  const randomNonExistentArticleId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to delete the non-existent article and expect a 404 error
  await TestValidator.httpError(
    "delete non-existent article",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.erase(
        adminConnection,
        {
          articleId: randomNonExistentArticleId,
        },
      );
    },
  );
}
