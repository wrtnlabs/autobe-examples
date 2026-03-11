import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_log_null_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: typia.random<IEcommerceMallAdmin.IJoin>(),
    },
  );
  typia.assert(admin);
  // 2. Retrieve audit log entry with valid auditLogId
  const auditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const auditLog: IEcommerceMallAdminAuditLog =
    await api.functional.ecommerceMall.admin.audit_logs.at(adminConnection, {
      auditLogId,
    });
  typia.assert(auditLog);
  // 3. Validate required fields are always present
  TestValidator.equals("audit log id", auditLog.id, auditLogId);
  TestValidator.equals("admin_id present", auditLog.admin_id !== null, true);
  TestValidator.equals(
    "action_type present",
    auditLog.action_type !== "",
    true,
  );
  TestValidator.equals(
    "target_entity_type present",
    auditLog.target_entity_type !== "",
    true,
  );
  TestValidator.equals("created_at present", auditLog.created_at !== "", true);
  TestValidator.equals("updated_at present", auditLog.updated_at !== "", true);
  // 4. Validate optional nullable fields (can be null or have values)
  TestValidator.equals(
    "target_entity_id can be null",
    auditLog.target_entity_id === null ||
      typeof auditLog.target_entity_id === "string",
    true,
  );
  TestValidator.equals(
    "changes can be null",
    auditLog.changes === null || typeof auditLog.changes === "string",
    true,
  );
  TestValidator.equals(
    "previous_values can be null",
    auditLog.previous_values === null ||
      typeof auditLog.previous_values === "string",
    true,
  );
  TestValidator.equals(
    "new_values can be null",
    auditLog.new_values === null || typeof auditLog.new_values === "string",
    true,
  );
  TestValidator.equals(
    "request_id can be null",
    auditLog.request_id === null || typeof auditLog.request_id === "string",
    true,
  );
  TestValidator.equals(
    "ip_address can be null",
    auditLog.ip_address === null || typeof auditLog.ip_address === "string",
    true,
  );
  TestValidator.equals(
    "user_agent can be null",
    auditLog.user_agent === null || typeof auditLog.user_agent === "string",
    true,
  );
}
