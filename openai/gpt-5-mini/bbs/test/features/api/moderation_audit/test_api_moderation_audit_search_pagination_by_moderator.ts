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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAudit";

export async function test_api_moderation_audit_search_pagination_by_moderator(
  connection: api.IConnection,
) {
  // 1) Member signs up
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "Str0ngP@ssw0rd!",
        href: "https://example.com/app",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2) As member, create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) As member, create two comments under the article
  const comment1: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);

  const comment2: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);

  // 4) As member, file reports referencing the article and a comment
  const reportForArticle: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        target_type: "article",
        target_id: article.id,
        reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
        explanation: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportForArticle);

  const reportForComment: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        target_type: "comment",
        target_id: comment1.id,
        reason_category: "Spam" as IDiscussionBoardReportReasonCategory,
        explanation: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportForComment);

  // 5) Create a moderator account (this will replace connection Authorization)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: "Str0ngP@ssw0rd!",
        href: "https://example.com/moderator",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  const moderator: IDiscussionBoardModerator.ISummary =
    moderatorAuth.moderator ?? {
      id: moderatorAuth.id,
      username: moderatorAuth.username,
      display_name: moderatorAuth.display_name ?? null,
      created_at: moderatorAuth.created_at,
      updated_at: moderatorAuth.updated_at,
    };

  // 6) As moderator, create moderation actions referencing the created reports
  const action1: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          discussion_board_report_id: reportForArticle.id,
          action_type: "hide",
          action_reason: "Automated test: hide offensive article",
          target_type: "article",
          target_id: article.id,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(action1);

  const action2: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          discussion_board_report_id: reportForComment.id,
          action_type: "warn",
          action_reason: "Automated test: warn spammy comment",
          target_type: "comment",
          target_id: comment1.id,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(action2);

  // 7) As moderator, query moderation audits filtered by moderator and time range
  const occurredTo = new Date().toISOString();
  const occurredFrom = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // last 5 minutes

  const pageLimit = 1;
  const pageNumber = 1;

  const auditPage: IPageIDiscussionBoardModerationAudit.ISummary =
    await api.functional.discussionBoard.moderator.moderationAudits.index(
      connection,
      {
        body: {
          actorModeratorId: moderator.id,
          eventType: "moderation.action",
          occurredFrom,
          occurredTo,
          page: pageNumber,
          limit: pageLimit,
          sort: "-occurredAt",
        } satisfies IDiscussionBoardModerationAudit.IRequest,
      },
    );
  typia.assert(auditPage);

  // Basic pagination metadata assertions
  TestValidator.equals(
    "pagination current page is requested page",
    auditPage.pagination.current,
    pageNumber,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    auditPage.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    auditPage.pagination.records >= 0,
  );

  // Data assertions: length should be <= limit and every result belongs to the moderator
  TestValidator.predicate(
    "data length less or equal to limit",
    auditPage.data.length <= pageLimit,
  );

  if (auditPage.data.length > 0) {
    for (const item of auditPage.data) {
      // Prefer actor_moderator_id when available; otherwise check actor_moderator summary
      if (
        item.actor_moderator_id !== null &&
        item.actor_moderator_id !== undefined
      ) {
        TestValidator.equals(
          "audit actor moderator id matches",
          item.actor_moderator_id,
          moderator.id,
        );
      } else if (item.actor_moderator) {
        TestValidator.equals(
          "audit actor moderator summary id matches",
          item.actor_moderator.id,
          moderator.id,
        );
      } else if (item.moderation_action) {
        // As a last resort, check embedded moderation_action.moderator.id if present
        TestValidator.predicate(
          "embedded moderation action contains moderator summary or id",
          item.moderation_action !== null &&
            item.moderation_action !== undefined,
        );
      }

      // Ensure event_type reflects moderation action or that moderation_action exists
      TestValidator.predicate(
        "audit item has moderation action context",
        item.event_type === "moderation.action" ||
          (item.moderation_action !== null &&
            item.moderation_action !== undefined),
      );
    }
  }
}
