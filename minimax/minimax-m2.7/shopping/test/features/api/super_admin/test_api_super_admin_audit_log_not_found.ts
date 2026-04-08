import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import type { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieving a non-existent audit log returns 404 error.
 *
 * Validates that the GET /superAdmin/super-admin/audit-logs/{logId} endpoint
 * correctly handles the case when an audit log with the specified UUID does not
 * exist in the database. The endpoint should return HTTP 404 status with the
 * message 'Audit log not found'.
 *
 * 1. Authenticate as super admin via POST /auth/superAdmin/join
 * 2. Generate a random UUID that doesn't exist in the database
 * 3. Call GET /superAdmin/super-admin/audit-logs/{logId} with the non-existent UUID
 * 4. Assert HTTP 404 status is returned
 * 5. Assert error message equals 'Audit log not found'
 */
export async function test_api_super_admin_audit_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a random UUID that doesn't exist in the database
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // 3-5. Call the endpoint and validate 404 error response
  await TestValidator.httpError(
    "audit log not found returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.at(
        superAdminConnection,
        {
          logId: nonExistentLogId,
        },
      );
    },
  );
}
