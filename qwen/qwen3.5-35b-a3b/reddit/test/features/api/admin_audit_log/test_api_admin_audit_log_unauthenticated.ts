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

export async function test_api_admin_audit_log_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // Create a valid UUID for the audit log test
  const logId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve audit log WITHOUT any authentication
  // The connection object should NOT have Authorization header
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  // Expected: 401 Unauthorized response
  await TestValidator.httpError(
    "unauthenticated request should return 401",
    401,
    async () => {
      return await api.functional.redditPlatform.admin.audit_logs.getByLogid(
        unauthenticatedConnection,
        {
          logId: logId,
        },
      );
    },
  );
}
