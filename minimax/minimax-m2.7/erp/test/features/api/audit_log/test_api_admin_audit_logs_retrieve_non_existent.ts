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

/**
 * Test retrieving a non-existent admin audit log returns 404 error.
 *
 * Prerequisites: Authenticate as admin using join endpoint to obtain valid JWT token.
 *
 * Steps:
 * 1. Call POST /erpHrm/auth/admin/join to create a new admin account and obtain authentication tokens
 * 2. Use the access_token from the join response as Bearer token in Authorization header
 * 3. Call GET /erpHrm/admin/admin-audit-logs/{auditLogId} with a UUID that does not exist in the system
 *
 * Expected validations:
 * - Response status code should be 404
 * - Response body should contain an appropriate error message indicating the audit log was not found
 * - No audit log data should be returned in the response body
 */
export async function test_api_admin_audit_logs_retrieve_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to obtain valid JWT token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Attempt to retrieve a non-existent audit log
  const nonExistentAuditLogId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  // Step 3: Validate that the API returns 404 error for non-existent audit log
  await TestValidator.error("non-existent audit log returns 404", async () => {
    await api.functional.erpHrm.admin.admin_audit_logs.at(adminConnection, {
      auditLogId: nonExistentAuditLogId,
    });
  });
}
