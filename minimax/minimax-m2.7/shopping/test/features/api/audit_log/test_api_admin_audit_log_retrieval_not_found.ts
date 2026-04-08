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

/**
 * Test that retrieving a non-existent audit log returns a 404 error response.
 *
 * Validates the API's handling of requests for audit log entries that do not exist in the system. This test ensures proper error handling when a client attempts to access a specific audit log using a non-existent UUID identifier.
 *
 * The test flow involves:
 * 1. Authenticating as a super administrator using the authorization utility
 * 2. Generating a UUID that is guaranteed not to exist in the database
 * 3. Attempting to retrieve the audit log by the non-existent ID
 * 4. Verifying that a 404 Not Found error is returned
 *
 * This validation is important for security and proper API design, ensuring that the system gracefully handles requests for resources that have been deleted or never existed.
 */
export async function test_api_admin_audit_log_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a UUID that does not correspond to any existing audit log
  const nonExistentLogId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  // 3. Attempt to retrieve the non-existent audit log and expect 404 error
  await TestValidator.httpError(
    "retrieving non-existent audit log should return 404",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin.audit_logs.at(
        superAdminConnection,
        { logId: nonExistentLogId },
      ),
  );
}
