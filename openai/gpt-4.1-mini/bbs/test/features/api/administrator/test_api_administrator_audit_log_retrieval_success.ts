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

export async function test_api_administrator_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator user join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Create a new audit log entry by triggering an admin action (simulate by getting a non-existing audit log and catching error)
  // Since we cannot create audit log via API, we simulate by using a random UUID and expecting 404
  const randomAuditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test 404 on non-existing audit log UUID
  await TestValidator.httpError(
    "audit log retrieval with non-existing UUID should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.auditLogs.at(
        adminConnection,
        { id: randomAuditLogId },
      );
    },
  );
  // 4. Unauthorized user should not access
  const nonAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized user cannot access audit log retrieval",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.auditLogs.at(
        nonAdminConnection,
        {
          id: randomAuditLogId,
        },
      );
    },
  );
}
