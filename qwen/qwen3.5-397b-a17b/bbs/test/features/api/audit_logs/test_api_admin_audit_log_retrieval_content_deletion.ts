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
 * Test retrieving an audit log entry for article or comment deletion action.
 *
 * This test validates the audit trail for content moderation activities by:
 * 1. Creating an administrator account using authorize_admin_join utility
 * 2. Retrieving an audit log entry by ID
 * 3. Verifying the audit record captures all required fields including
 *    administrator information, action type, target entity, target ID,
 *    details JSON, network information (IP and user agent), and timestamp
 *
 * This ensures complete traceability for compliance investigations.
 */
export async function test_api_admin_audit_log_retrieval_content_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
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
  // 2. Retrieve audit log entry by ID
  const auditLog: IDiscussionBoardAdminAuditLog =
    await api.functional.discussionBoard.admin.audit_logs.at(adminConnection, {
      logId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(auditLog);
  // 3. Validate audit log structure for content deletion tracking
  TestValidator.predicate(
    "action type is deletion-related",
    auditLog.action_type === "delete_article" ||
      auditLog.action_type === "delete_comment",
  );
  TestValidator.predicate(
    "target entity is content type",
    auditLog.target_entity === "article" ||
      auditLog.target_entity === "comment",
  );
  TestValidator.predicate(
    "target ID exists for content deletion",
    auditLog.target_id !== null,
  );
  TestValidator.predicate(
    "administrator info present",
    auditLog.admin.id !== undefined && auditLog.admin.grade !== undefined,
  );
  TestValidator.predicate(
    "network information captured",
    auditLog.ip !== undefined && auditLog.user_agent !== undefined,
  );
  TestValidator.predicate(
    "timestamp exists",
    auditLog.created_at !== undefined,
  );
}
