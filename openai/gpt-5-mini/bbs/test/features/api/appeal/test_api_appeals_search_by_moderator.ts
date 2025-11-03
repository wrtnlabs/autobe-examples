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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";

export async function test_api_appeals_search_by_moderator(
  connection: api.IConnection,
) {
  // 1) Prepare two independent connection contexts for member and moderator
  const moderatorConn: api.IConnection = { ...connection, headers: {} };
  const memberConn: api.IConnection = { ...connection, headers: {} };

  // 2) Moderator join (create moderator account and obtain tokens)
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConn, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: "StrongP@ssw0rd123",
        href: "https://example.com/moderator/onboard",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3) Member join (create member account and obtain tokens)
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "MemberP@ssword123",
        href: "https://example.com/article/new",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 4) As member: create an article to host the comment
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(memberConn, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_slug: null,
        tag_slugs: [],
        state: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 5) As member: create a comment for the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConn,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 6) As member: submit a report targeting the comment
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(memberConn, {
      body: {
        target_type: "comment",
        target_id: comment.id,
        reason_category: "Harassment",
        explanation: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // 7) As moderator: create a moderation action referencing the report
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      moderatorConn,
      {
        body: {
          discussion_board_report_id: report.id,
          action_type: "hide",
          action_reason: "Policy violation - test",
          action_duration_days: null,
          target_type: "comment",
          target_id: comment.id,
          effective_from: null,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 8) As member: create an appeal referencing the moderation_action_id
  const appeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.create(memberConn, {
      body: {
        moderation_action_id: moderationAction.id,
        explanation: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    });
  typia.assert(appeal);

  // 9) As moderator: search appeals with filters and pagination
  const page: IPageIDiscussionBoardAppeal.ISummary =
    await api.functional.discussionBoard.moderator.appeals.index(
      moderatorConn,
      {
        body: {
          page: 1,
          limit: 10,
          status: ["pending"] as IEDiscussionBoardAppealStatus[] | null,
          includeClosed: false,
          appellantMemberId: null,
          moderationActionId: moderationAction.id,
          reportId: null,
          search: null,
          sort: "-createdAt",
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  // Validate response type and pagination metadata
  typia.assert(page);
  TestValidator.predicate(
    "pagination present",
    page.pagination !== undefined && page.pagination !== null,
  );
  TestValidator.equals("page number is 1", page.pagination.current, 1);
  TestValidator.equals("page limit is 10", page.pagination.limit, 10);

  // Ensure returned data contains at least one appeal referencing the moderation action
  TestValidator.predicate(
    "returned data is an array",
    Array.isArray(page.data),
  );

  const found = page.data.find((x) => {
    // moderation_action is optional in summary; match by id when provided
    return (
      (x.moderation_action !== null &&
        x.moderation_action !== undefined &&
        x.moderation_action.id === moderationAction.id) ||
      (x.report !== null && x.report !== undefined && x.report.id === report.id)
    );
  });

  TestValidator.predicate(
    "created appeal is present in moderator listing",
    found !== undefined && found !== null,
  );

  // Check appellant summary matches created member
  if (found) {
    TestValidator.equals(
      "appellant id matches created member",
      found.appellant.id,
      member.id,
    );
    TestValidator.equals(
      "appeal status is pending or in requested statuses",
      found.status,
      "pending",
    );
  }

  // 10) Access denied when called without moderator credentials
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("access denied for non-moderator", async () => {
    await api.functional.discussionBoard.moderator.appeals.index(unauthConn, {
      body: { page: 1, limit: 1 } satisfies IDiscussionBoardAppeal.IRequest,
    });
  });
}
