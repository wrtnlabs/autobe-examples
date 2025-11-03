import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IEDiscussionBoardAppealStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEDiscussionBoardAppealStatus";

/**
 * Validate moderator updating an appeal: RBAC, chronology, and referential
 * integrity.
 *
 * Business scenario:
 *
 * 1. Member registers and creates an article, attachment, comment, and a report.
 * 2. Member files an appeal referencing the report (status 'pending').
 * 3. Moderator registers, creates a moderation action referencing the
 *    report/comment, and updates the appeal to a resolved status while setting
 *    resolvedAt >= created_at and linking moderationActionId.
 * 4. Validate correct update, chronological validation, and RBAC enforcement.
 */
export async function test_api_appeal_update_by_moderator(
  connection: api.IConnection,
) {
  // 1) Member signs up and authenticates (connection.headers updated by SDK)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: memberEmail,
        password: "Passw0rd!1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2) Member creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) Member uploads an attachment for the article
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: `${RandomGenerator.alphaNumeric(6)}.png`,
          storage_key: typia.random<string & tags.Format<"uri">>(),
          mime_type: "image/png",
          size: 1024,
          is_image: true,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4) Member posts a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5) Member files a report referencing the comment (report will be used for appeal)
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        target_type: "comment",
        target_id: comment.id,
        reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
        explanation: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // 6) Member creates an appeal referencing the report
  const appeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.create(connection, {
      body: {
        report_id: report.id,
        explanation: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    });
  typia.assert(appeal);
  TestValidator.equals("appeal initially pending", appeal.status, "pending");

  // 7) Moderator signs up and authenticates (connection.headers updated by SDK)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: "Mod3rator!Pass",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 8) Moderator creates a moderation action referencing the report/comment
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          discussion_board_report_id: report.id,
          action_type: "warn",
          action_reason: "Reviewed by automated triage and moderator",
          action_duration_days: null,
          target_type: "comment",
          target_id: comment.id,
          effective_from: null,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 9) Moderator updates the appeal: status -> accepted, set resolvedAt >= created_at, include moderationActionId
  const resolvedAt = new Date(
    new Date(appeal.created_at).getTime() + 1000,
  ).toISOString();
  const updated: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.moderator.appeals.update(connection, {
      appealId: appeal.id,
      body: {
        status: "accepted",
        resolvedAt: resolvedAt,
        moderationActionId: moderationAction.id,
        resolutionReason: "Appeal reviewed and resolved in favor of member",
      } satisfies IDiscussionBoardAppeal.IUpdate,
    });
  typia.assert(updated);

  TestValidator.equals(
    "appeal status updated to accepted",
    updated.status,
    "accepted",
  );
  if (updated.resolved_at === null || updated.resolved_at === undefined) {
    throw new Error("resolved_at must not be null after acceptance");
  }
  TestValidator.predicate(
    "resolved_at should be after or equal to created_at",
    new Date(updated.resolved_at).getTime() >=
      new Date(appeal.created_at).getTime(),
  );
  TestValidator.equals(
    "moderation action id linked",
    updated.moderation_action_id,
    moderationAction.id,
  );

  // 10) Negative case: setting resolvedAt earlier than created_at should fail
  const earlier = new Date(
    new Date(appeal.created_at).getTime() - 60_000,
  ).toISOString();
  await TestValidator.error(
    "cannot set resolved_at earlier than created_at",
    async () => {
      await api.functional.discussionBoard.moderator.appeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            status: "rejected",
            resolvedAt: earlier,
            moderationActionId: moderationAction.id,
          } satisfies IDiscussionBoardAppeal.IUpdate,
        },
      );
    },
  );

  // 11) RBAC: a member-scoped token must not be able to perform moderator PUT
  // Re-create a member (new token) to assert RBAC denial
  const badMemberEmail = typia.random<string & tags.Format<"email">>();
  const badMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: badMemberEmail,
        password: "Passw0rd!1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(badMember);

  await TestValidator.error(
    "member cannot update appeal (forbidden)",
    async () => {
      await api.functional.discussionBoard.moderator.appeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            status: "rejected",
            resolvedAt: new Date().toISOString(),
          } satisfies IDiscussionBoardAppeal.IUpdate,
        },
      );
    },
  );
}
