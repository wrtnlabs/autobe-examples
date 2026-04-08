import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test successful retrieval of an administrator audit log entry by super administrator.
 *
 * Steps:
 * 1. Authenticate as superAdmin by calling authorize_super_admin_join utility function
 * 2. List audit logs by calling PATCH /ecommerceMall/superAdmin/audit-logs to obtain a valid logId
 * 3. Use the obtained audit log ID (logId) to retrieve the specific audit log entry
 * 4. Verify the response body contains all required IEcommerceMallAdminAuditLog fields: id (UUID), action (string), resourceType (string or null), resourceId (string or null), details (string or null), ip (string or null), userAgent (string or null), createdAt (ISO datetime), and admin relation (IEcommerceMallAdmin.Summary)
 * 5. Verify the admin relation contains: id, email, grade (regular or super_admin), status (active, suspended, or banned), nickname, and createdAt
 * 6. Confirm the audit log data matches the expected immutable record format for security monitoring and compliance tracking
 */
export async function test_api_superadmin_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    { body: joinInput },
  );
  typia.assert(authorizedSuperAdmin);
  // 2. List audit logs to obtain a valid logId
  const requestBody = {
    adminId: null,
    actionTypes: null,
    resourceTypes: null,
    resourceId: null,
    ipAddress: null,
    dateFrom: null,
    dateTo: null,
    createdAt: null,
    id: null,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallAdminAuditLog.IRequest;
  const auditLogList =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: requestBody },
    );
  typia.assert(auditLogList);
  // Verify that audit logs exist for testing
  TestValidator.predicate("audit logs exist", auditLogList.data.length > 0);
  // Get the first audit log ID
  const logId = auditLogList.data[0]?.id;
  typia.assertGuard(logId!);
  // 3. Retrieve the specific audit log entry
  const auditLog = await api.functional.ecommerceMall.superAdmin.audit_logs.at(
    superAdminConnection,
    { logId },
  );
  typia.assert(auditLog);
  // 4. Validate the retrieved audit log matches the requested logId
  TestValidator.equals(
    "retrieved log id matches requested",
    auditLog.id,
    logId,
  );
  // 5. Verify the audit log ID exists in the list for cross-reference validation
  const foundInList = auditLogList.data.find((log) => log.id === auditLog.id);
  TestValidator.predicate(
    "retrieved audit log exists in list",
    foundInList !== undefined,
  );
  // 6. Validate admin relationship consistency
  if (foundInList) {
    TestValidator.equals(
      "admin id matches",
      auditLog.admin.id,
      foundInList.admin.id,
    );
  }
}
