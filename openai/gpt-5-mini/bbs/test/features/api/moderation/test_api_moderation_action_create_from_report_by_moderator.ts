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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_moderation_action_create_from_report_by_moderator(
  connection: api.IConnection,
) {
  // 1) Register a member and obtain authenticated member context
  const memberConn: api.IConnection = { ...connection, headers: {} };
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(8)}Aa1!`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, { body: memberBody });
  typia.assert(member);

  // 2) Member creates an article (draft to avoid publish authorization checks)
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    state: "draft",
  } satisfies IDiscussionBoardArticle.ICreate;
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(memberConn, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Member posts a comment on the article
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4) Member files a report for the comment
  const reportBody = {
    target_type: "comment",
    target_id: comment.id,
    reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.comments.reports.create(
      memberConn,
      {
        commentId: comment.id,
        body: reportBody,
      },
    );
  typia.assert(report);

  // 5) Register a moderator and obtain authenticated moderator context
  const moderatorConn: api.IConnection = { ...connection, headers: {} };
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(8)}Aa1!`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConn, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 6) Authorization enforcement: member should not be able to call moderator endpoint
  await TestValidator.error(
    "member cannot create moderation action (RBAC)",
    async () => {
      await api.functional.discussionBoard.moderator.moderation.actions.create(
        memberConn,
        {
          body: {
            discussion_board_report_id: report.id,
            action_type: "hide",
            action_reason: "Violation of rules",
            target_type: "comment",
            target_id: comment.id,
          } satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    },
  );

  // 7) Moderator creates a moderation action referencing the report and comment
  const actionBody = {
    discussion_board_report_id: report.id,
    action_type: "hide",
    action_reason: "Inappropriate content reported by community",
    target_type: "comment",
    target_id: comment.id,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const action: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      moderatorConn,
      { body: actionBody },
    );
  typia.assert(action);

  // 8) Validate created moderation action's contents
  TestValidator.equals("action type is hide", action.actionType, "hide");
  TestValidator.equals(
    "action target type matches comment",
    action.targetType,
    "comment",
  );
  TestValidator.equals(
    "action target id matches created comment",
    action.targetId,
    comment.id,
  );
  TestValidator.equals(
    "moderator id in action matches authenticated moderator",
    action.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "action references original report",
    action.report?.id ?? null,
    report.id,
  );
  TestValidator.predicate(
    "action has createdAt timestamp",
    action.createdAt !== null &&
      action.createdAt !== undefined &&
      action.createdAt.length > 0,
  );

  // 9) Referential integrity negative test: creating an action with a non-existent report should produce an error
  await TestValidator.error(
    "creating action with non-existent report should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderation.actions.create(
        moderatorConn,
        {
          body: {
            discussion_board_report_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            action_type: "hide",
            target_type: "comment",
            target_id: comment.id,
          } satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    },
  );

  // Note: The provided SDK materials do not include explicit listing or audit
  // retrieval endpoints for moderation actions or moderation_audit records. As
  // such, this test uses the returned moderation action (which includes a
  // moderator summary and optional report summary) as authoritative evidence of
  // persistence and linking. If listing/audit endpoints are added to the SDK,
  // additional assertions should be introduced to verify audit emission and
  // discoverability via index endpoints.
}
