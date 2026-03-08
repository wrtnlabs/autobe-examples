import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join endpoint
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {});
  typia.assert(adminAuthorized);
  // 2. Create admin connection with authentication token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 3. Attempt to retrieve non-existent audit log using random UUID
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // 4. Validate that 404 error is returned
  await TestValidator.error(
    "should return 404 for non-existent audit log",
    async () => {
      await api.functional.redditPlatform.admin.audit_logs.getByLogid(
        adminConnection,
        { logId: nonExistentLogId },
      );
    },
  );
}
