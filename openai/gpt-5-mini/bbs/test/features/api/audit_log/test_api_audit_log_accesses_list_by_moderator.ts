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

export async function test_api_audit_log_accesses_list_by_moderator(
  connection: api.IConnection,
) {
  /**
   * End-to-end scenario:
   *
   * 1. Create moderator account (join)
   * 2. Create a moderation action to generate audit activity
   * 3. Read an audit log to produce an access audit record
   * 4. List accesses for that audit log and validate that the moderator's access
   *    is present in the paginated result
   */

  // 1) Moderator sign-up
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Str0ng!Passw0rd2025",
    href: "https://example.com/moderator/join",
    referrer: "https://example.com/",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Ensure we have moderator id for later assertions
  const moderatorId: string = moderator.id;

  // 2) Create moderation action to generate an audit log entry
  const moderationActionBody = {
    // No discussion_board_report_id provided - optional
    action_type: "warn",
    action_reason: RandomGenerator.paragraph({ sentences: 4 }),
    target_type: "member",
    target_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // 3) Read an audit log to produce an access audit entry. The exact audit
  //    log id cannot be deterministically derived from the moderationAction
  //    DTO; request a plausible audit log id and trust the server to record
  //    the access. Use the returned auditLog.id for the listing step.
  const initialAuditLogId = typia.random<string & tags.Format<"uuid">>();

  const auditLog: IDiscussionBoardAuditLog =
    await api.functional.discussionBoard.moderator.auditLogs.at(connection, {
      auditLogId: initialAuditLogId,
    });
  typia.assert(auditLog);

  // Use the returned audit log id (server may return the same id or supply
  // the real record); this id will scope the access listing.
  const auditLogIdToQuery: string = auditLog.id;

  // 4) List accesses for the audit log with page=1, limit=20 and filter by
  //    moderator accessor type and the moderator id.
  const accessesRequest = {
    page: 1,
    limit: 20,
    accessorType: "moderator",
    accessorId: moderatorId,
  } satisfies IDiscussionBoardAuditLogAccess.IRequest;

  const page: IPageIDiscussionBoardAuditLogAccess.ISummary =
    await api.functional.discussionBoard.moderator.auditLogs.accesses.index(
      connection,
      {
        auditLogId: auditLogIdToQuery,
        body: accessesRequest,
      },
    );
  typia.assert(page);

  // Business assertions:
  // - Pagination metadata
  TestValidator.equals(
    "pagination current should be 1",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    page.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination pages should be >= 1",
    page.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    page.pagination.records >= 0,
  );

  // - There must be at least one access entry for the moderator that caused
  //   the read. Respect PII redaction: accessor_id might be null when redacted
  //   so also check embedded accessor summary.
  const foundModeratorAccess = ArrayUtil.has(
    page.data,
    (entry: IDiscussionBoardAuditLogAccess.ISummary) => {
      if (entry.accessor_type !== "moderator") return false;
      if (entry.accessor_id !== null && entry.accessor_id !== undefined) {
        return entry.accessor_id === moderatorId;
      }
      if (
        entry.accessor &&
        (entry.accessor as IDiscussionBoardModerator.ISummary).id
      )
        return (
          (entry.accessor as IDiscussionBoardModerator.ISummary).id ===
          moderatorId
        );
      return false;
    },
  );

  TestValidator.predicate(
    "at least one access entry belongs to created moderator",
    foundModeratorAccess,
  );

  // - accessed_at timestamps exist for entries: check at least one non-empty
  //   accessed_at in page.data
  const hasAccessedAt = ArrayUtil.has(
    page.data,
    (e) => typeof e.accessed_at === "string" && e.accessed_at.length > 0,
  );
  TestValidator.predicate(
    "at least one access entry has accessed_at",
    hasAccessedAt,
  );
}
