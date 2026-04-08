import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministratorAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLogDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving a non-existent administrator audit log entry.
 *
 * Validates that the system properly handles requests for audit log entries that do not exist in the database. Ensures appropriate HTTP 404 error is returned when attempting to retrieve an audit log with a UUID that has no corresponding record.
 *
 * This test verifies the error handling behavior when administrators attempt to access audit logs that were never created or have been removed from the system.
 *
 * 1. Register and authenticate as an administrator
 * 2. Generate a random UUID that does not exist in the system
 * 3. Attempt to retrieve the non-existent audit log entry
 * 4. Verify HTTP 404 Not Found error is thrown
 */
export async function test_api_administrator_audit_log_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate a non-existent UUID
  const nonExistentLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent audit log and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent audit log",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.audit_logs.at(
        adminConnection,
        {
          logId: nonExistentLogId,
        },
      ),
  );
}
