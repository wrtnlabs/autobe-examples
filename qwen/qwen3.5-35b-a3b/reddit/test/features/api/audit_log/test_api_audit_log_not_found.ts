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

/**
 * Test retrieval of non-existent audit log entry.
 * Validates 404 response handling for missing audit log resources.
 */
export async function test_api_audit_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  typia.assert(adminAuth);

  // 2. Generate non-existent UUID for audit log ID
  const nonExistentAuditLogId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>() satisfies string as string & tags.Format<"uuid">;

  // 3. Attempt to retrieve non-existent audit log
  await TestValidator.error(
    "should return 404 for non-existent audit log",
    async () => {
      await api.functional.redditPlatform.admin.audit_logs.getByAuditlogid(
        adminConnection,
        {
          auditLogId: nonExistentAuditLogId,
        },
      );
    },
  );
}