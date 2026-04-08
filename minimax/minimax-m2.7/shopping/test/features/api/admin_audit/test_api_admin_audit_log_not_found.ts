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

/**
 * Test retrieving a non-existent admin audit log returns 404 error.
 *
 * Validates that the system properly handles requests for audit log records that do not exist. This test verifies the API returns appropriate 404 status codes and error messages when attempting to access non-existent audit log entries. Additionally tests malformed UUID handling.
 *
 * 1. Administrator authenticates using admin join endpoint.
 * 2. Attempts to retrieve an audit log with a non-existent UUID (all zeros format).
 * 3. Verifies 404 Not Found response is returned.
 * 4. Attempts to retrieve an audit log with an invalid/malformed UUID format.
 * 5. Verifies appropriate error handling for malformed UUID input.
 */
export async function test_api_admin_audit_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test non-existent UUID (all zeros UUID format)
  const nonExistentAuditLogId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  await TestValidator.httpError(
    "non-existent audit log returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.audit_logs.getByAuditlogid(
        adminConnection,
        { auditLogId: nonExistentAuditLogId },
      ),
  );
  // 3. Test random non-existent UUID
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "random non-existent UUID returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.audit_logs.getByAuditlogid(
        adminConnection,
        { auditLogId: randomNonExistentId },
      ),
  );
  // 4. Test malformed UUID format (invalid UUID structure)
  const malformedUuid = "not-a-valid-uuid-format" as string &
    tags.Format<"uuid">;
  await TestValidator.httpError(
    "malformed UUID returns error",
    [400, 404],
    async () =>
      await api.functional.ecommerceMall.admin.admin.audit_logs.getByAuditlogid(
        adminConnection,
        { auditLogId: malformedUuid },
      ),
  );
}
