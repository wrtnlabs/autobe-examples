import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test unauthorized access to the audit log retrieval endpoint.
 *
 * Steps:
 * - Attempt unauthenticated GET request to /discussionBoard/administrator/auditLogs/{id} - expect 401 error
 * - Authenticate as administrator via join
 * - Attempt to retrieve audit log with valid admin credentials and same UUID
 * - Verify type safety and response correctness
 */
export async function test_api_audit_log_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt to access audit log without authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  const randomAuditLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.auditLogs.atAuditLog(
        unauthenticatedConnection,
        { id: randomAuditLogId },
      );
    },
  );
  // 2. Authenticate as administrator via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 3. Attempt retrieval with valid admin connection and same audit log id
  const auditLog =
    await api.functional.discussionBoard.administrator.auditLogs.atAuditLog(
      adminConnection,
      { id: randomAuditLogId },
    );
  typia.assert(auditLog);
  TestValidator.equals("audit log id matches", auditLog.id, randomAuditLogId);
}
