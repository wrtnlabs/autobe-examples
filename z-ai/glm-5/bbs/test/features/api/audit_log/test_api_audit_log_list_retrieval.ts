import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of paginated audit log entries by an authenticated administrator.
 *
 * **Preconditions**:
 * - Administrator account exists and is authenticated
 * - Audit logs table may contain entries from previous administrative actions
 *
 * **Test Steps**:
 * 1. Authenticate as an administrator using /auth/admin/join
 * 2. Send a PATCH request to /admin/audit-logs with no filters (empty request body)
 * 3. Verify the response returns a valid paginated structure
 * 4. Verify each audit log entry contains valid action type
 * 5. Verify entries are sorted by created_at in descending order (most recent first)
 */
export async function test_api_audit_log_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Send PATCH request to /admin/audit-logs with empty filters
  const response = await api.functional.discussionBoard.admin.audit_logs.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardAdminAuditLog.IRequest,
    },
  );
  typia.assert(response);
  // 3. Verify each audit log entry has valid action type (business rule)
  const validActions = [
    "ban",
    "unban",
    "promote",
    "demote",
    "delete_article",
    "delete_comment",
    "create_section",
    "update_section",
    "delete_section",
    "approve_request",
    "reject_request",
  ] as const;
  response.data.forEach((entry) => {
    TestValidator.predicate(
      "action is valid enum value",
      validActions.includes(entry.action as (typeof validActions)[number]),
    );
  });
  // 4. Verify entries are sorted by created_at descending (business rule)
  if (response.data.length > 1) {
    const timestamps = response.data.map((entry) =>
      new Date(entry.created_at).getTime(),
    );
    for (let i = 1; i < timestamps.length; i++) {
      TestValidator.predicate(
        "entries sorted by created_at descending",
        timestamps[i - 1] >= timestamps[i],
      );
    }
  }
}
