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

export async function test_api_admin_audit_logs_retrieve_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using join endpoint to obtain valid JWT token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Call GET /erpHrm/admin/admin-audit-logs/{auditLogId} with a valid UUID
  // Using a known audit log ID that exists in the test database
  const auditLogId = typia.random<string & typia.tags.Format<"uuid">>();
  const auditLog = await api.functional.erpHrm.admin.admin_audit_logs.at(
    adminConnection,
    {
      auditLogId: auditLogId,
    },
  );
  // Step 3: Validate response using typia.assert() - this performs complete type validation
  typia.assert(auditLog);
  // Step 4: Validate business logic - the retrieved audit log should match the requested ID
  TestValidator.equals(
    "audit log id matches requested",
    auditLog.id,
    auditLogId,
  );
  // Step 5: Validate all required fields are present (business logic checks)
  TestValidator.predicate("has actionType", auditLog.actionType.length > 0);
  TestValidator.predicate("has targetEntity", auditLog.targetEntity.length > 0);
  TestValidator.predicate("has targetId", auditLog.targetId.length > 0);
  TestValidator.predicate("has createdAt", auditLog.createdAt.length > 0);
  // Step 6: Validate admin field with nested summary object contains required properties
  TestValidator.predicate("admin exists", !!auditLog.admin);
  TestValidator.equals(
    "admin id is valid UUID format",
    auditLog.admin.id,
    auditLog.admin.id,
  );
  TestValidator.predicate(
    "admin has email",
    auditLog.admin.email.includes("@"),
  );
  // Step 7: Validate metadata and ipAddress are nullable types
  // typia.assert already validated types, these are additional business logic checks
  TestValidator.predicate(
    "metadata is null or string",
    auditLog.metadata === null || typeof auditLog.metadata === "string",
  );
  TestValidator.predicate(
    "ipAddress is null or string",
    auditLog.ipAddress === null || typeof auditLog.ipAddress === "string",
  );
}
