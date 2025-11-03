import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAuditLogAccess } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLogAccess";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_audit_log_access_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for each role to avoid mutating the shared connection.headers
  const memberConn: api.IConnection = { ...connection, headers: {} };
  const moderatorConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Member registration and setup
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/member/onboarding",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, { body: memberBody });
  typia.assert(memberAuth);

  // 3) Member creates an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_slug: null,
    tag_slugs: [],
    state: "draft",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(memberConn, {
      body: articleBody,
    });
  typia.assert(article);

  // 4) Member creates a comment on the article
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConn,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5) Member files a report targeting the article
  const reportBody = {
    target_type: "article",
    target_id: article.id,
    reason_category: "Spam" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(memberConn, {
      body: reportBody,
    });
  typia.assert(report);

  // 6) Moderator registration
  const moderatorBody = {
    username: `mod_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}+mod@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/mod/onboarding",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConn, {
      body: moderatorBody,
    });
  typia.assert(moderatorAuth);

  // 7) Moderator creates a moderation action referencing the report
  const moderationBody = {
    discussion_board_report_id: report.id,
    action_type: "hide",
    action_reason: "E2E test hide",
    action_duration_days: null,
    target_type: "article",
    target_id: article.id,
    effective_from: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      moderatorConn,
      { body: moderationBody },
    );
  typia.assert(moderationAction);

  // 8) Attempt to retrieve an audit-log-access record as the moderator.
  // Since there's no direct API to create audit-log-access entries, generate a UUID
  // and call the retrieval endpoint; in simulate-mode the SDK returns a random record.
  const candidateAuditId = typia.random<string & tags.Format<"uuid">>();

  const audit: IDiscussionBoardAuditLogAccess =
    await api.functional.discussionBoard.moderator.auditLogAccesses.at(
      moderatorConn,
      { auditLogAccessId: candidateAuditId },
    );
  typia.assert(audit);

  // Business-level validations for moderator (privileged) retrieval
  TestValidator.predicate(
    "audit record has id",
    audit.id !== undefined && typeof audit.id === "string",
  );
  TestValidator.predicate(
    "audit record has auditLogId",
    audit.auditLogId !== undefined && typeof audit.auditLogId === "string",
  );
  TestValidator.predicate(
    "accessorType is allowed token",
    ["moderator", "administrator", "system", "guest"].includes(
      audit.accessorType,
    ),
  );
  // Sensitive fields may be redacted depending on policies; allow both null or string
  TestValidator.predicate(
    "accessorId is either null or string",
    audit.accessorId === null || typeof audit.accessorId === "string",
  );
  TestValidator.predicate(
    "ip is either null or string",
    audit.ip === null || typeof audit.ip === "string",
  );

  // 9) Negative tests: unauthenticated and non-moderator access should fail
  await TestValidator.error(
    "unauthenticated user cannot retrieve audit access",
    async () => {
      await api.functional.discussionBoard.moderator.auditLogAccesses.at(
        unauthConn,
        {
          auditLogAccessId: audit.id,
        },
      );
    },
  );

  await TestValidator.error(
    "non-moderator member cannot retrieve audit access",
    async () => {
      await api.functional.discussionBoard.moderator.auditLogAccesses.at(
        memberConn,
        {
          auditLogAccessId: audit.id,
        },
      );
    },
  );

  // 10) Optional: check that moderator's retrieved record contains createdAt
  TestValidator.predicate(
    "audit record contains createdAt",
    typeof audit.createdAt === "string" && audit.createdAt.length > 0,
  );
}
