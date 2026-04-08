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

export async function test_api_admin_audit_log_retrieval_by_valid_uuid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join - this generates an audit log entry
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  // 2. The admin join action creates an audit log with admin's UUID as target
  // We use the admin's UUID as the audit log target to retrieve
  const auditLogId = authorized.id as string & tags.Format<"uuid">;
  // 3. Retrieve the audit log using the admin's UUID (which was logged as target_id)
  const auditLog = await api.functional.erpHrm.admin.audit_logs.at(
    adminConnection,
    {
      auditLogId,
    },
  );
  // 4. Validate response using typia.assert for complete type validation
  typia.assert(auditLog);
  // 5. Validate business logic - audit log references the admin who performed action
  TestValidator.equals(
    "admin id matches audit log target",
    auditLog.admin.id,
    authorized.id,
  );
  TestValidator.equals(
    "admin email matches authorized",
    auditLog.admin.email,
    authorized.email,
  );
  TestValidator.equals(
    "admin displayName matches authorized",
    auditLog.admin.displayName,
    authorized.displayName,
  );
  // 6. Audit logs are immutable - target_id should match admin's UUID
  TestValidator.equals(
    "target_id references the admin",
    auditLog.target_id,
    authorized.id,
  );
}
