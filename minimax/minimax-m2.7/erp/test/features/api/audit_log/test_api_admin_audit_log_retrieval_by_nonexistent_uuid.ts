import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_log_retrieval_by_nonexistent_uuid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to obtain JWT tokens for authorized access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a valid UUID format that does not correspond to any existing audit log entry
  const nonExistentAuditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /erpHrm/admin/audit-logs/{auditLogId} with the non-existent UUID
  // 4. Validate response is 404 Not Found with appropriate error message
  await TestValidator.httpError(
    "should return 404 for non-existent audit log",
    404,
    async () =>
      await api.functional.erpHrm.admin.audit_logs.at(adminConnection, {
        auditLogId: nonExistentAuditLogId,
      }),
  );
}
