import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
 * Test retrieving an audit log with comprehensive metadata for security investigation.
 * Verify that the audit log contains all necessary security information including
 * IP address, user agent, success status, error messages (if applicable), and
 * detailed metadata specific to the action type. This validates the audit trail
 * completeness required for administrative oversight and forensic analysis.
 */
export async function test_api_admin_audit_log_comprehensive_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate random audit log ID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the audit log
  const auditLog = await api.functional.discussionBoard.admin.audit_logs.at(
    adminConnection,
    { auditLogId },
  );
  typia.assert(auditLog);
  // Validate comprehensive metadata
  TestValidator.equals("audit log ID matches", auditLog.id, auditLogId);
  TestValidator.predicate(
    "actor type is present",
    auditLog.actor_type.length > 0,
  );
  TestValidator.predicate(
    "action type is present",
    auditLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "description is present",
    auditLog.description.length > 0,
  );
  TestValidator.predicate(
    "success status is boolean",
    typeof auditLog.success === "boolean",
  );
  TestValidator.predicate(
    "created at timestamp is valid",
    auditLog.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at timestamp is valid",
    auditLog.updated_at.length > 0,
  );
  // Validate security information when present
  if (auditLog.ip_address !== null && auditLog.ip_address !== undefined) {
    TestValidator.predicate(
      "IP address is valid string",
      auditLog.ip_address.length > 0,
    );
  }
  if (auditLog.user_agent !== null && auditLog.user_agent !== undefined) {
    TestValidator.predicate(
      "user agent is valid string",
      auditLog.user_agent.length > 0,
    );
  }
  // Validate metadata field when present
  if (auditLog.metadata !== null && auditLog.metadata !== undefined) {
    TestValidator.predicate(
      "metadata is valid string",
      auditLog.metadata.length > 0,
    );
  }
  // Validate error message field when present
  if (auditLog.error_message !== null && auditLog.error_message !== undefined) {
    TestValidator.predicate(
      "error message is valid string",
      auditLog.error_message.length > 0,
    );
  }
  // Validate actor reference when present
  if (auditLog.actor !== null && auditLog.actor !== undefined) {
    TestValidator.predicate("actor has valid ID", auditLog.actor.id.length > 0);
  }
  // Validate target references when present
  if (auditLog.targetUser !== null && auditLog.targetUser !== undefined) {
    TestValidator.predicate(
      "target user has valid ID",
      auditLog.targetUser.id.length > 0,
    );
  }
  if (auditLog.targetAdmin !== null && auditLog.targetAdmin !== undefined) {
    TestValidator.predicate(
      "target admin has valid ID",
      auditLog.targetAdmin.id.length > 0,
    );
  }
  if (
    auditLog.targetSuperAdmin !== null &&
    auditLog.targetSuperAdmin !== undefined
  ) {
    TestValidator.predicate(
      "target super admin has valid ID",
      auditLog.targetSuperAdmin.id.length > 0,
    );
  }
  if (auditLog.targetArticle !== null && auditLog.targetArticle !== undefined) {
    TestValidator.predicate(
      "target article has valid ID",
      auditLog.targetArticle.id.length > 0,
    );
  }
  if (auditLog.targetComment !== null && auditLog.targetComment !== undefined) {
    TestValidator.predicate(
      "target comment has valid ID",
      auditLog.targetComment.id.length > 0,
    );
  }
  if (auditLog.targetSection !== null && auditLog.targetSection !== undefined) {
    TestValidator.predicate(
      "target section has valid ID",
      auditLog.targetSection.id.length > 0,
    );
  }
}
