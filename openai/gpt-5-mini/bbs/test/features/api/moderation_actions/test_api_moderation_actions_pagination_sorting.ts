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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

export async function test_api_moderation_actions_pagination_sorting(
  connection: api.IConnection,
) {
  // 1) Member signs up (and becomes authenticated for member-scoped operations)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "http://example.com/member/onboard",
      referrer: "http://example.com/",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 2) Member creates an article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3) Member creates a comment under the article
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4) Member files two reports: one targeting article, one targeting comment
  const reportForArticle =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        target_type: "article",
        target_id: article.id,
        reason_category: "Spam",
        explanation: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportForArticle);

  const reportForComment =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        target_type: "comment",
        target_id: comment.id,
        reason_category: "Harassment",
        explanation: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportForComment);

  // 5) Create a moderator (SDK will attach moderator token to connection)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: `mod_${RandomGenerator.alphaNumeric(6)}`,
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "http://example.com/moderator/onboard",
      referrer: "http://example.com/",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 6) As moderator, create multiple moderation actions with different action_type and effective_from timestamps
  // Prepare 3 actions with spaced effective_from to help ordering expectations
  const now = Date.now();
  const actionsToCreate = [
    {
      discussion_board_report_id: reportForArticle.id,
      action_type: "hide" as const,
      action_reason: "Hide spammy article",
      target_type: "article" as const,
      target_id: article.id,
      effective_from: new Date(now + 1000).toISOString(),
    },
    {
      discussion_board_report_id: reportForComment.id,
      action_type: "remove" as const,
      action_reason: "Remove abusive comment",
      target_type: "comment" as const,
      target_id: comment.id,
      effective_from: new Date(now + 2000).toISOString(),
    },
    {
      discussion_board_report_id: null,
      action_type: "warn" as const,
      action_reason: "Warning issued",
      target_type: "member" as const,
      target_id: typia.random<string & tags.Format<"uuid">>(),
      effective_from: new Date(now + 3000).toISOString(),
    },
  ];

  const createdActions: IDiscussionBoardModerationAction[] = [];
  for (const item of actionsToCreate) {
    const payload = {
      discussion_board_report_id: item.discussion_board_report_id,
      action_type: item.action_type,
      action_reason: item.action_reason,
      action_duration_days: null,
      target_type: item.target_type,
      target_id: item.target_id,
      effective_from: item.effective_from,
    } satisfies IDiscussionBoardModerationAction.ICreate;

    const created =
      await api.functional.discussionBoard.moderator.moderation.actions.create(
        connection,
        { body: payload },
      );
    typia.assert(created);
    createdActions.push(created);
    // small delay between creations is not required because we set effective_from, but keep loop sequential
  }

  // 7) Compute expected ordering by createdAt descending using the server-returned createdAt
  const expectedDesc = [...createdActions].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  // 8) Call index with pagination: page=2 limit=1 sort='-createdAt'
  const page2Result =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 1,
          sort: "-createdAt",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(page2Result);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination.current is page 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination.limit equals 1",
    page2Result.pagination.limit,
    1,
  );

  // Validate returned list size respects limit
  TestValidator.predicate(
    "returned data respects limit 1",
    page2Result.data.length === 1,
  );

  // Validate ordering: page 2 with limit 1 should return the second item in expectedDesc
  const expectedSecond = expectedDesc[1];
  TestValidator.equals(
    "returned second item matches expected ordering",
    page2Result.data[0].id,
    expectedSecond.id,
  );

  // 9) Validate filtering by action_type: query for 'hide'
  const hideFilter =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
          actionType: "hide",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(hideFilter);
  TestValidator.predicate(
    "all returned items have action_type 'hide'",
    hideFilter.data.every((d) => d.action_type === "hide"),
  );

  // 10) Validate filtering by moderatorId (should be moderator.summary.id)
  // Use moderator.moderator?.id if present in the authorized payload; fallback to moderator.id
  const moderatorId = (moderator.moderator?.id ?? moderator.id) as string;

  const modFilter =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
          moderatorId: moderatorId,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(modFilter);
  TestValidator.predicate(
    "all returned items belong to moderator",
    modFilter.data.every((d) => d.moderator.id === moderatorId),
  );
}
