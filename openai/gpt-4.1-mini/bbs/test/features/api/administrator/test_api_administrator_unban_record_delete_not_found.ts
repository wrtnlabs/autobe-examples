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

export async function test_api_administrator_unban_record_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator (join)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
    },
  });
  typia.assert(admin);
  adminConnection.headers = { Authorization: admin.token.access };
  // 2. Attempt to DELETE non-existent unban record
  const randomUnbanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Assert 404 Not Found handling
  await TestValidator.httpError(
    "delete non-existent unban record",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administrator.unbans.erase(
        adminConnection,
        { unbanId: randomUnbanId },
      );
    },
  );
}
