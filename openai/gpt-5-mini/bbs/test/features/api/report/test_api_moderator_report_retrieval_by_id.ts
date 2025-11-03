import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_moderator_report_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1) Use separate connections to isolate authentication headers
  const memberConn: api.IConnection = { ...connection, headers: {} };
  const moderatorConn: api.IConnection = { ...connection, headers: {} };

  // 2) Member signs up
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(memberConn, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: "Aa1!securepass", // meets minimum complexity in docs
      href: "https://example.org/articles/create",
      referrer: "https://example.org/home",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 3) Member creates an article
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConn,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
          wordMin: 4,
          wordMax: 8,
        }),
        category_slug: undefined,
        tag_slugs: undefined,
        state: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.predicate(
    "article has id",
    typeof article.id === "string" && article.id.length > 0,
  );

  // 4) Member files a report against the article
  const report = await api.functional.discussionBoard.member.reports.create(
    memberConn,
    {
      body: {
        target_type: "article",
        target_id: article.id,
        reason_category:
          (typia.random<IDiscussionBoardReportReasonCategory>() as IDiscussionBoardReportReasonCategory) ||
          "Other",
        explanation: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.predicate(
    "report id exists",
    typeof report.id === "string" && report.id.length > 0,
  );

  // 5) Moderator signs up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(moderatorConn, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: moderatorEmail,
      password: "Bb2!securepass",
      href: "https://example.org/moderation/dashboard",
      referrer: "https://example.org/login",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 6) Optionally create a moderation action referencing the report to test embedding
  const createdAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      moderatorConn,
      {
        body: {
          discussion_board_report_id: report.id,
          action_type: "hide",
          action_reason: "Automated test: hide for investigation",
          action_duration_days: null,
          target_type: "article",
          target_id: article.id,
          effective_from: new Date().toISOString(),
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(createdAction);
  TestValidator.predicate(
    "moderation action created has id",
    typeof createdAction.id === "string" && createdAction.id.length > 0,
  );

  // 7) As moderator, retrieve the report detail
  const reportDetail =
    await api.functional.discussionBoard.moderator.reports.at(moderatorConn, {
      reportId: report.id,
    });
  typia.assert(reportDetail);

  // Business validations on returned report
  TestValidator.predicate(
    "report has required id",
    typeof reportDetail.id === "string" && reportDetail.id === report.id,
  );
  TestValidator.predicate(
    "report has reporter_member_id",
    typeof reportDetail.reporter_member_id === "string" &&
      reportDetail.reporter_member_id.length > 0,
  );
  TestValidator.predicate(
    "report has target_type and target_id",
    reportDetail.target_type === "article" &&
      reportDetail.target_id === article.id,
  );
  TestValidator.predicate(
    "report has reason_category",
    typeof reportDetail.reason_category === "string",
  );
  TestValidator.predicate(
    "report has status",
    typeof reportDetail.status === "string",
  );
  TestValidator.predicate(
    "report has created_at",
    typeof reportDetail.created_at === "string" &&
      reportDetail.created_at.length > 0,
  );

  // Sensitive field rules: reporter_session_id may be present only as id when allowed
  if (
    reportDetail.reporter_session_id !== null &&
    reportDetail.reporter_session_id !== undefined
  ) {
    TestValidator.predicate(
      "reporter_session_id is just an id or null",
      typeof reportDetail.reporter_session_id === "string",
    );
  }

  // If a moderation action was created that referenced this report, createdAction.report should be present or the createdAction.id should exist for contextual linking
  TestValidator.predicate(
    "related moderation action exists for investigation",
    typeof createdAction.id === "string" && createdAction.id.length > 0,
  );

  // 8) Negative cases
  // 8a) Non-moderator (memberConn) cannot access moderator endpoint
  await TestValidator.error(
    "non-moderator cannot access moderator report detail",
    async () => {
      await api.functional.discussionBoard.moderator.reports.at(memberConn, {
        reportId: report.id,
      });
    },
  );

  // 8b) Invalid UUID path returns error (invalid input)
  await TestValidator.error("invalid UUID in path throws", async () => {
    await api.functional.discussionBoard.moderator.reports.at(moderatorConn, {
      reportId: "not-a-uuid" as string & tags.Format<"uuid">,
    });
  });

  // 8c) Non-existent reportId should result in an error (404-like behavior)
  const randomMissingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent reportId throws", async () => {
    await api.functional.discussionBoard.moderator.reports.at(moderatorConn, {
      reportId: randomMissingId,
    });
  });
}
