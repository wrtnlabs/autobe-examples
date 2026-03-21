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

export async function test_api_admin_audit_logs_response_structure_validation(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving an admin audit log validates the complete response structure
  // 1. Authenticate as admin using join endpoint to obtain valid JWT token
  // 2. Call GET /erpHrm/admin/admin-audit-logs/{auditLogId} with a valid UUID
  // 3. Validate response structure with all required fields
  // 1. Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin: IErpHrmAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: typia.random<IErpHrmAdmin.IJoin>() });
  // 2. Generate a valid UUID for the audit log ID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the admin audit log
  const auditLog: IErpHrmAdminAuditLog =
    await api.functional.erpHrm.admin.admin_audit_logs.at(adminConnection, {
      auditLogId: auditLogId,
    });
  typia.assert(auditLog);
  // 4. Validate response structure - id field must match request
  TestValidator.equals("audit log id matches request", auditLog.id, auditLogId);
  // 5. Validate actionType - must be non-empty string
  TestValidator.predicate(
    "actionType is non-empty string",
    auditLog.actionType.length > 0,
  );
  // 6. Validate targetEntity - must be non-empty string
  TestValidator.predicate(
    "targetEntity is non-empty string",
    auditLog.targetEntity.length > 0,
  );
  // 7. Validate targetId - must be valid UUID string
  TestValidator.predicate(
    "targetId is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.targetId,
    ),
  );
  // 8. Validate createdAt - must be valid ISO 8601 datetime in the past
  TestValidator.predicate(
    "createdAt is valid ISO 8601 datetime",
    !isNaN(Date.parse(auditLog.createdAt)),
  );
  TestValidator.predicate(
    "createdAt is in the past",
    new Date(auditLog.createdAt).getTime() < Date.now(),
  );
  // 9. Validate admin nested object structure
  TestValidator.predicate(
    "admin.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.admin.id,
    ),
  );
  TestValidator.predicate(
    "admin.email is valid email format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auditLog.admin.email),
  );
  TestValidator.predicate(
    "admin.display_name is non-empty",
    auditLog.admin.display_name.length > 0,
  );
  // 10. Validate nullable fields
  TestValidator.predicate(
    "metadata is nullable string or null",
    auditLog.metadata === null ||
      auditLog.metadata === undefined ||
      typeof auditLog.metadata === "string",
  );
  TestValidator.predicate(
    "ipAddress is nullable string or null",
    auditLog.ipAddress === null ||
      auditLog.ipAddress === undefined ||
      typeof auditLog.ipAddress === "string",
  );
}