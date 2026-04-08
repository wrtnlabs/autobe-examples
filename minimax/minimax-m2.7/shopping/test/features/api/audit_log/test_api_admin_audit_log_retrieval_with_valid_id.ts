import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_audit_log_retrieval_with_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Generate a valid UUID for the audit log ID
  // Note: In a real scenario, this would come from a previous admin action
  // Since there's no list endpoint, we use a generated UUID
  const logId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /ecommerceMall/superAdmin/admin/audit-logs/{logId}
  const auditLog =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.at(
      superAdminConnection,
      {
        logId: logId,
      },
    );
  typia.assert(auditLog);
  // 4. Validate response structure
  TestValidator.equals("logId matches requested", auditLog.id, logId);
  TestValidator.predicate("admin object exists", auditLog.admin !== undefined);
  TestValidator.predicate(
    "action string exists",
    typeof auditLog.action === "string" && auditLog.action.length > 0,
  );
  TestValidator.predicate(
    "resourceType string exists",
    typeof auditLog.resourceType === "string" &&
      auditLog.resourceType.length > 0,
  );
  TestValidator.predicate(
    "resourceId is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.resourceId,
    ),
  );
  TestValidator.predicate(
    "ipAddress string exists",
    typeof auditLog.ipAddress === "string" && auditLog.ipAddress.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(auditLog.createdAt),
  );
  // Validate admin summary structure
  TestValidator.predicate(
    "admin.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.admin.id,
    ),
  );
  TestValidator.predicate(
    "admin.email is valid",
    typeof auditLog.admin.email === "string" &&
      auditLog.admin.email.includes("@"),
  );
  TestValidator.predicate(
    "admin.name exists",
    typeof auditLog.admin.name === "string" && auditLog.admin.name.length > 0,
  );
}
