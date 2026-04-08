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

export async function test_api_admin_audit_log_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Submit admin request to create an admin account
  // This action creates an audit log entry that we can retrieve
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized =
    await api.functional.ecommerceMall.auth.admin.request.join(
      adminConnection,
      {
        body: {
          actorType: "customer",
          requestedGrade: "admin",
          reason:
            "Need admin access for e2e testing of audit log retrieval functionality",
          href: "https://example.com/admin",
          referrer: "https://example.com/home",
        },
      },
    );
  typia.assert(adminAuthorized);
  // The admin request should create an audit log entry
  // Now we need to find the audit log ID that was created
  // Since we just submitted the request, we need to retrieve audit logs
  // For this test, we'll use a known audit log or test with a valid UUID format
  // 2. Test retrieving audit log by ID - first get a valid audit log ID
  // We'll use the admin ID from the created admin as the resource ID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the audit log
  const auditLog = await api.functional.ecommerceMall.admin.admin.audit_logs.at(
    adminConnection,
    {
      auditLogId: auditLogId,
    },
  );
  // 4. Validate response with typia.assert (performs complete runtime type validation)
  typia.assert(auditLog);
  // 5. Validate business logic - audit log should have required fields
  TestValidator.equals(
    "audit log id matches requested",
    auditLog.id,
    auditLogId,
  );
  TestValidator.predicate(
    "action is a non-empty string",
    auditLog.action.length > 0,
  );
  TestValidator.predicate(
    "resource type is a non-empty string",
    auditLog.resourceType.length > 0,
  );
  TestValidator.predicate(
    "resource id is valid uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.resourceId,
    ),
  );
  TestValidator.predicate(
    "ip address is non-empty",
    auditLog.ipAddress.length > 0,
  );
  TestValidator.predicate(
    "created at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(auditLog.createdAt),
  );
  // 6. Validate admin summary object
  TestValidator.predicate(
    "admin id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.admin.id,
    ),
  );
  TestValidator.predicate(
    "admin email is non-empty",
    auditLog.admin.email.length > 0,
  );
  TestValidator.predicate(
    "admin name is non-empty",
    auditLog.admin.name.length > 0,
  );
  TestValidator.predicate(
    "admin has is_super_admin boolean",
    typeof auditLog.admin.is_super_admin === "boolean",
  );
  // 7. Test 404 for non-existent audit log
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent audit log returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.admin.audit_logs.at(
        adminConnection,
        {
          auditLogId: nonExistentId,
        },
      );
    },
  );
}
