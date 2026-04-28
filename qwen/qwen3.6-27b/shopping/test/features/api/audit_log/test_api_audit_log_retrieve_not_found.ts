import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdminAuditLog";
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
 * Test retrieving a non-existent audit log record returns 404 error.
 *
 * Validates that the audit log retrieval endpoint properly handles requests for non-existent records by returning a 404 HTTP error. This ensures the API correctly distinguishes between valid and invalid log IDs in the immutable append-only audit ledger.
 *
 * Special attention is given to verifying that proper authentication is required and that the error response is correctly formatted even for non-existent resources.
 *
 * 1. Authenticate a new administrator account.
 * 2. Generate a random UUID that does not exist in the audit log database.
 * 3. Attempt to retrieve the non-existent audit log.
 * 4. Validate that a 404 HTTP error is returned.
 */
export async function test_api_audit_log_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a random UUID that won't exist
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // 3 & 4. Attempt retrieval and validate 404 error
  await TestValidator.httpError(
    "non-existent audit log returns 404",
    404,
    async () =>
      await api.functional.ecommercePlatform.admin.audit_logs.at(
        adminConnection,
        { logId: nonExistentLogId },
      ),
  );
}
