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

export async function test_api_appeal_create_from_moderation_action(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connections for member and moderator actors
  const memberConn: api.IConnection = { ...connection, headers: {} };
  const moderatorConn: api.IConnection = { ...connection, headers: {} };

  // 2. Member signs up (appellant)
  const memberInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
    href: "https://example.com/app",
    referrer: "https://example.com/ref",
  } satisfies IDiscussionBoardMember.IJoin;

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, { body: memberInput });
  typia.assert(memberAuth);

  // 3. Member creates an article
  const articleCreate = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(memberConn, {
      body: articleCreate,
    });
  typia.assert(article);

  // 4. Member creates a comment under the article
  const commentCreate = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConn,
      {
        articleId: article.id,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  // 5. Member files a report against the comment
  const reportCreate = {
    target_type: "comment",
    target_id: comment.id,
    reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(memberConn, {
      body: reportCreate,
    });
  typia.assert(report);

  // 6. Moderator signs up
  const moderatorInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Moder@torPass123",
    href: "https://example.com/mod",
    referrer: "https://example.com/ref",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConn, {
      body: moderatorInput,
    });
  typia.assert(moderatorAuth);

  // 7. Moderator creates a moderation action referencing the report
  const moderationActionCreate = {
    discussion_board_report_id: report.id,
    action_type: "hide",
    action_reason: "Violation of community guidelines",
    action_duration_days: null,
    target_type: "comment",
    target_id: comment.id,
    effective_from: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      moderatorConn,
      { body: moderationActionCreate },
    );
  typia.assert(moderationAction);

  // Validate moderation action links back to the originating report
  TestValidator.equals(
    "moderation action links to originating report",
    moderationAction.report?.id,
    report.id,
  );

  // 8. As the original member (appellant), create an appeal referencing the moderation action
  const appealCreate = {
    moderation_action_id: moderationAction.id,
    explanation: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardAppeal.ICreate;

  const appeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.create(memberConn, {
      body: appealCreate,
    });
  typia.assert(appeal);

  // Business validations
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.equals(
    "appeal references correct moderation action",
    appeal.moderation_action_id,
    moderationAction.id,
  );
  TestValidator.equals(
    "appeal appellant is the creating member",
    appeal.appellant_member_id,
    memberAuth.id,
  );

  // 9. Negative: creating an appeal without moderation_action_id or report_id should fail
  await TestValidator.error(
    "appeal without moderation_action_id or report_id should fail",
    async () => {
      await api.functional.discussionBoard.member.appeals.create(memberConn, {
        body: {
          explanation: "Missing references intentionally",
        } satisfies IDiscussionBoardAppeal.ICreate,
      });
    },
  );

  // 10. Negative: duplicate appeal by same appellant against same moderation action should fail
  await TestValidator.error(
    "duplicate appeal by same member against same moderation action should fail",
    async () => {
      await api.functional.discussionBoard.member.appeals.create(memberConn, {
        body: {
          moderation_action_id: moderationAction.id,
          explanation: "Attempting duplicate appeal",
        } satisfies IDiscussionBoardAppeal.ICreate,
      });
    },
  );
}
