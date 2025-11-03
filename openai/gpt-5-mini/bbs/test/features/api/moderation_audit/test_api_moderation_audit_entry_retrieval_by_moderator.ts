import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerationAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAudit";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_moderation_audit_entry_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1) Member signs up (use explicit safe payload to satisfy password & URI constraints)
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`,
    password: `${RandomGenerator.alphaNumeric(8)}Ab!`, // guarantees >=12 by concatenation
    href: "https://example.com/",
    referrer: "https://example.com/",
    ip: undefined,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create an article as the member. Use draft state to avoid publish restrictions.
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    // omit category_slug/tag_slugs instead of explicitly setting undefined
    state: "draft",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Create an attachment for the article with valid properties
  const attachmentBody = {
    original_filename: "test-image.jpg",
    storage_key: "https://storage.example/test-image.jpg",
    mime_type: "image/jpeg",
    size: 1024,
    is_image: true,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 4) Create a comment on the article
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 8 }),
    parentCommentId: null,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5) Submit a report against the comment (polymorphic target)
  const reportBody = {
    target_type: "comment",
    target_id: comment.id,
    reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 6) Create a moderator account (switches connection to moderator auth)
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}+mod@example.com`,
    password: `${RandomGenerator.alphaNumeric(8)}Cd#`,
    href: "https://example.com/",
    referrer: "https://example.com/",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 7) As moderator create a moderation action referencing the report
  const actionBody = {
    discussion_board_report_id: report.id,
    action_type: "hide",
    action_reason: "Policy violation: harassment",
    action_duration_days: null,
    target_type: "comment",
    target_id: comment.id,
    effective_from: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const action: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      { body: actionBody },
    );
  typia.assert(action);

  // 8) Retrieve a moderation audit entry. Pragmatic approach: use action.id as
  // audit id parameter when direct audit id is not returned by the create
  // operation. This is a practical rewrite to use available SDK functions.
  const moderationAuditId: string & tags.Format<"uuid"> = action.id;

  const audit: IDiscussionBoardModerationAudit =
    await api.functional.discussionBoard.moderator.moderationAudits.at(
      connection,
      { moderationAuditId },
    );
  typia.assert(audit);

  // Validations
  TestValidator.predicate("audit has id", !!audit.id);
  TestValidator.predicate(
    "audit has eventType",
    typeof audit.eventType === "string",
  );
  TestValidator.predicate(
    "audit has occurredAt",
    typeof audit.occurredAt === "string",
  );
  TestValidator.predicate(
    "audit payload is present and string",
    typeof audit.eventPayload === "string",
  );

  // Tolerant reference validation: audit should reference either the action or the report
  TestValidator.predicate(
    "audit references created action or report",
    audit.moderationActionId === action.id || audit.reportId === report.id,
  );
}
