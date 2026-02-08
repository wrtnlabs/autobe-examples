import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_log_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create administrator user and login
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorAuth = await authorize_administrator_join(
    administratorConnection,
    {
      body: {},
    },
  );
  typia.assert(administratorAuth);
  administratorConnection.headers = {
    Authorization: `Bearer ${administratorAuth.token.access}`,
  };
  // 2. Generate a random UUID for audit log id to fetch
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to access audit log using base connection (unauthenticated) -> expect forbidden or unauthorized
  await TestValidator.httpError(
    "access denied for unauthenticated user",
    [401, 403],
    async () =>
      await api.functional.discussionBoard.administrator.auditLogs.at(
        connection,
        {
          id: auditLogId,
        },
      ),
  );
  // 4. Attempt to access audit log using administratorConnection (authenticated) -> expect success
  const auditLog =
    await api.functional.discussionBoard.administrator.auditLogs.at(
      administratorConnection,
      {
        id: auditLogId,
      },
    );
  typia.assert(auditLog);
}
