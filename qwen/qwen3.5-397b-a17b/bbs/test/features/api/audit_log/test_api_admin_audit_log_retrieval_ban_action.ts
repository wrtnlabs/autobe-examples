import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test retrieving a single administrative audit log entry for a user ban action.
 *
 * This test validates the GET /discussionBoard/admin/audit-logs/{logId} endpoint by:
 * 1. Authenticating as administrator
 * 2. Retrieving an audit log entry by its UUID
 * 3. Validating the response contains complete audit information including:
 *    - Administrator who performed the action (with grade and member profile)
 *    - Action type, target entity, and target ID
 *    - Details JSON, IP address, user agent, and timestamp
 */
export async function test_api_admin_audit_log_retrieval_ban_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Generate audit log ID and retrieve the audit log entry
  const logId = typia.random<string & tags.Format<"uuid">>();
  const auditLog = await api.functional.discussionBoard.admin.audit_logs.at(
    adminConnection,
    {
      logId,
    },
  );
  // 3. Validate complete audit log structure with typia.assert()
  // This performs comprehensive validation of all fields including:
  // - id: UUID format
  // - admin: Administrator summary with grade and member profile
  // - action_type: String enum (ban, unban, delete_article, etc.)
  // - target_entity: String (user, article, comment, section, admin_request)
  // - target_id: UUID or null
  // - details: JSON string or null
  // - ip: String format
  // - user_agent: String format
  // - created_at: ISO 8601 date-time format
  typia.assert(auditLog);
  // 4. Validate the returned audit log ID matches the requested ID
  TestValidator.equals("audit log id matches request", auditLog.id, logId);
}
