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
 * Test that retrieving an audit log with a non-existent ID returns 404 Not Found.
 * Steps:
 * 1) Authenticate as administrator using join endpoint
 * 2) Attempt to fetch audit log with random non-existent UUID
 * 3) Verify 404 error is returned
 */
export async function test_api_admin_audit_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2) Generate a random non-existent UUID for the audit log
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // 3) Attempt to fetch the audit log - should return 404
  await TestValidator.httpError(
    "should return 404 for non-existent audit log",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.audit_logs.at(adminConnection, {
        logId: nonExistentLogId,
      });
    },
  );
}
