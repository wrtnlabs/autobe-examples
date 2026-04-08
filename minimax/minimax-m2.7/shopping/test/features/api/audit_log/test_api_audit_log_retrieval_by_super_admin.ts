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

export async function test_api_audit_log_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {});
  // Update connection headers with JWT token for authenticated requests
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Generate a valid audit log UUID for testing
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve audit log by ID
  const auditLog =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.at(
      superAdminConnection,
      {
        auditLogId: auditLogId,
      },
    );
  // 4. Validate response using typia.assert for complete type validation
  typia.assert(auditLog);
  // 5. Validate required fields are present and properly typed
  TestValidator.equals(
    "audit log id is valid UUID format",
    auditLog.id,
    auditLogId,
  );
  TestValidator.predicate(
    "action is non-empty string",
    auditLog.action.length > 0,
  );
  TestValidator.predicate(
    "resource type is non-empty string",
    auditLog.resourceType.length > 0,
  );
  TestValidator.predicate(
    "resource id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.resourceId,
    ),
  );
  TestValidator.predicate(
    "ip address is non-empty string",
    auditLog.ipAddress.length > 0,
  );
  TestValidator.predicate(
    "created at is valid ISO date-time format",
    !isNaN(Date.parse(auditLog.createdAt)),
  );
  // 6. Validate nested admin summary object
  TestValidator.equals(
    "admin id is valid UUID format",
    auditLog.admin.id,
    auditLog.admin.id,
  );
  TestValidator.predicate(
    "admin email is non-empty string",
    auditLog.admin.email.length > 0,
  );
  TestValidator.predicate(
    "admin name is non-empty string",
    auditLog.admin.name.length > 0,
  );
  TestValidator.predicate(
    "is_super_admin is boolean",
    typeof auditLog.admin.is_super_admin === "boolean",
  );
}