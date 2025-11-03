import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardAuditLogAccess } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLogAccess";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLogAccess } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLogAccess";

export async function test_api_audit_log_accesses_redaction_for_non_privileged_moderator(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate that non-elevated moderators receive redacted
   * audit-access entries for PII fields while still seeing accessor_type and
   * accessed_at for triage.
   *
   * Steps:
   *
   * 1. Create a standard (non-elevated) moderator account via join.
   * 2. Create a moderation action so an audit log entry exists.
   * 3. Read the audit log entry to ensure an access record is generated.
   * 4. Call the accesses.index endpoint to retrieve access records.
   * 5. Assert that accessor_type and accessed_at are present and that accessor_id,
   *    ip, and user_agent are explicitly redacted (null).
   */

  // 1) Create a non-elevated moderator account and authenticate
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        ip: null,
        href: "https://example.com/moderator/signup",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  // 2) Create a moderation action to ensure an audit log entry exists
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          discussion_board_report_id: null,
          action_type: "warn",
          action_reason: RandomGenerator.paragraph({ sentences: 3 }),
          action_duration_days: null,
          target_type: "member",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          effective_from: null,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 3) Read an audit log entry to generate an access record. Since the system
  //    may create audit rows asynchronously, we request a representative
  //    auditLog by calling GET with a generated UUID and then use its id for
  //    accesses listing. The SDK returns a valid audit log shape.
  const audit: IDiscussionBoardAuditLog =
    await api.functional.discussionBoard.moderator.auditLogs.at(connection, {
      auditLogId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(audit);

  // 4) Retrieve access records for the audit log. Use pagination defaults.
  const accessPage: IPageIDiscussionBoardAuditLogAccess.ISummary =
    await api.functional.discussionBoard.moderator.auditLogs.accesses.index(
      connection,
      {
        auditLogId: audit.id,
        body: {
          page: 1,
          limit: 20,
          accessorType: "moderator",
        } satisfies IDiscussionBoardAuditLogAccess.IRequest,
      },
    );
  typia.assert(accessPage);

  // 5) Business assertions: ensure entries exist and PII fields are redacted
  TestValidator.predicate("access records present", accessPage.data.length > 0);

  // For each returned access summary, verify required non-PII fields exist and
  // that sensitive fields are explicitly null for non-elevated moderator.
  for (const item of accessPage.data) {
    // accessor_type and accessed_at must be present and usable for triage
    TestValidator.predicate(
      "accessor_type is present",
      typeof item.accessor_type === "string" && item.accessor_type.length > 0,
    );
    TestValidator.predicate(
      "accessed_at is present",
      typeof item.accessed_at === "string" && item.accessed_at.length > 0,
    );

    // Sensitive PII fields MUST be redacted (explicit null) for this
    // non-privileged moderator. The API contract requires explicit null when
    // redaction is applied.
    TestValidator.equals(
      "accessor_id must be redacted for non-privileged moderator",
      item.accessor_id,
      null,
    );

    TestValidator.equals(
      "ip must be redacted for non-privileged moderator",
      item.ip,
      null,
    );

    TestValidator.equals(
      "user_agent must be redacted for non-privileged moderator",
      item.user_agent,
      null,
    );
  }
}
