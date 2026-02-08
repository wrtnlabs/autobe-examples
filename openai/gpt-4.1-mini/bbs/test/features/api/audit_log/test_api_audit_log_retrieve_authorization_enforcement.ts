import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_audit_log_retrieve_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Validate authorization enforcement by ensuring only super administrators can retrieve audit log entries.
  // Preconditions: No super administrator authentication.
  // Step 1: Attempt to access the audit log entry without authenticating as super administrator.
  // Step 2: Verify the request is denied with an authorization error (403 Forbidden or 401 Unauthorized).
  // Use the base connection directly without authentication.
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "access denied without super administrator authentication",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.auditLogs.at(
        connection,
        {
          id: auditLogId,
        },
      );
    },
  );
}
