import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of a specific audit log entry by logId.
 * Validates that authenticated admins can access audit log details with proper structure.
 */
export async function test_api_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Generate a valid UUID for logId (simulating an existing audit log)
  const logId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the audit log entry
  const auditLog = await api.functional.redditClone.admin.audit_logs.at(
    adminConnection,
    {
      logId,
    },
  );
  typia.assert(auditLog);
  // 4. Validate response structure and business logic
  TestValidator.equals("logId matches request", auditLog.id, logId);
  TestValidator.predicate("admin has valid id", auditLog.admin.id.length > 0);
  TestValidator.predicate(
    "admin has username",
    auditLog.admin.username.length > 0,
  );
  TestValidator.predicate(
    "admin has valid email",
    auditLog.admin.email.includes("@"),
  );
  TestValidator.predicate("has action type", auditLog.action_type.length > 0);
  TestValidator.predicate("has target type", auditLog.target_type.length > 0);
  TestValidator.predicate("has ip address", auditLog.ip_address.length > 0);
  TestValidator.predicate(
    "created_at is present",
    auditLog.created_at.length > 0,
  );
}
