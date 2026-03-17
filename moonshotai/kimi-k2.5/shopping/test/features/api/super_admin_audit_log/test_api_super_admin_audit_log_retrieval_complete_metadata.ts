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

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieving an audit log with complete forensic metadata.
 *
 * 1. Register as superAdmin (creates initial audit log entry)
 * 2. List audit logs to obtain a valid log ID
 * 3. Retrieve specific audit log by ID
 * 4. Verify audit log contains complete metadata: IP address, user agent,
 *    action type, resource type, resource ID, details, admin info, and ISO 8601 timestamp
 */
export async function test_api_super_admin_audit_log_retrieval_complete_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin-specific connection (isolation pattern)
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. Register as superAdmin - this creates an audit log entry
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // 2. List audit logs to get a valid log ID from prior administrative activity
  const auditLogList =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogList);
  TestValidator.predicate(
    "audit log list has at least one entry",
    auditLogList.data.length > 0,
  );
  // Get the most recent audit log ID (should be the superAdmin creation)
  const logId = auditLogList.data[0]!.id;
  // 3. Retrieve specific audit log with complete metadata
  const auditLog = await api.functional.ecommerceMall.superAdmin.audit_logs.at(
    superAdminConnection,
    {
      logId,
    },
  );
  typia.assert(auditLog);
  // 4. Verify complete forensic metadata is captured
  TestValidator.predicate(
    "audit log has valid UUID format ID",
    typia.is<string & tags.Format<"uuid">>(auditLog.id),
  );
  TestValidator.predicate(
    "audit log has action type captured",
    typeof auditLog.action === "string" && auditLog.action.length > 0,
  );
  TestValidator.predicate(
    "audit log has resource type field",
    auditLog.resourceType !== undefined,
  );
  TestValidator.predicate(
    "audit log has resource ID field",
    auditLog.resourceId !== undefined,
  );
  TestValidator.predicate(
    "audit log has details field",
    auditLog.details !== undefined,
  );
  TestValidator.predicate(
    "audit log captures IP address",
    typeof auditLog.ip === "string" && auditLog.ip.length > 0,
  );
  TestValidator.predicate(
    "audit log captures user agent",
    typeof auditLog.userAgent === "string" && auditLog.userAgent.length > 0,
  );
  TestValidator.predicate(
    "audit log has ISO 8601 createdAt timestamp",
    typia.is<string & tags.Format<"date-time">>(auditLog.createdAt),
  );
  TestValidator.predicate(
    "audit log has admin reference",
    auditLog.admin !== null &&
      typia.is<string & tags.Format<"uuid">>(auditLog.admin.id),
  );
  TestValidator.predicate(
    "audit log admin has email",
    typeof auditLog.admin.email === "string" && auditLog.admin.email.length > 0,
  );
}
