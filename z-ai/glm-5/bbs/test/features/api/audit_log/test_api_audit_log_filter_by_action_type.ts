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

export async function test_api_audit_log_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering audit log entries by specific action type.
   *
   * This test validates that administrators can filter audit logs by specific
   * administrative action types including ban, approve_request, and delete_comment.
   */
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Filter by 'ban' action type
  const banLogs = await api.functional.discussionBoard.admin.audit_logs.index(
    adminConnection,
    {
      body: { action: "ban" } satisfies IDiscussionBoardAdminAuditLog.IRequest,
    },
  );
  typia.assert(banLogs);
  // Verify all returned entries have action='ban'
  TestValidator.predicate("all ban logs have action='ban'", () =>
    banLogs.data.every((log) => log.action === "ban"),
  );
  // 3. Filter by 'approve_request' action type
  const approveRequestLogs =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "approve_request",
        } satisfies IDiscussionBoardAdminAuditLog.IRequest,
      },
    );
  typia.assert(approveRequestLogs);
  // Verify all returned entries have action='approve_request'
  TestValidator.predicate(
    "all approve_request logs have action='approve_request'",
    () =>
      approveRequestLogs.data.every((log) => log.action === "approve_request"),
  );
  // 4. Filter by 'delete_comment' action type
  const deleteCommentLogs =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "delete_comment",
        } satisfies IDiscussionBoardAdminAuditLog.IRequest,
      },
    );
  typia.assert(deleteCommentLogs);
  // Verify all returned entries have action='delete_comment'
  TestValidator.predicate(
    "all delete_comment logs have action='delete_comment'",
    () =>
      deleteCommentLogs.data.every((log) => log.action === "delete_comment"),
  );
}
