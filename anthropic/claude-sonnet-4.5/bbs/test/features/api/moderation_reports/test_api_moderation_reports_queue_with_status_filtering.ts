import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

export async function test_api_moderation_reports_queue_with_status_filtering(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });

  const articles = await ArrayUtil.asyncRepeat(5, async () => {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          summary: RandomGenerator.paragraph({ sentences: 2 }),
          category_ids: [category.id],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });

  const reportReasons = [
    "spam",
    "harassment",
    "misinformation",
    "off_topic",
    "other",
  ] as const;
  const reports = await ArrayUtil.asyncRepeat(8, async (index) => {
    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      {
        body: {
          reported_article_id: articles[index % articles.length].id,
          reported_comment_id: null,
          report_reason: RandomGenerator.pick(reportReasons),
          report_details: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  await api.functional.discussionBoard.moderator.reports.update(connection, {
    reportId: reports[0].id,
    body: {
      reviewing_moderator_id: moderator.id,
      status: "under_review",
    } satisfies IDiscussionBoardReport.IUpdate,
  });

  await api.functional.discussionBoard.moderator.reports.update(connection, {
    reportId: reports[1].id,
    body: {
      reviewing_moderator_id: moderator.id,
      status: "under_review",
    } satisfies IDiscussionBoardReport.IUpdate,
  });

  await api.functional.discussionBoard.moderator.reports.update(connection, {
    reportId: reports[2].id,
    body: {
      reviewing_moderator_id: moderator.id,
      status: "resolved",
      resolution_notes: "Content removed for violating guidelines",
    } satisfies IDiscussionBoardReport.IUpdate,
  });

  await api.functional.discussionBoard.moderator.reports.update(connection, {
    reportId: reports[3].id,
    body: {
      reviewing_moderator_id: moderator.id,
      status: "resolved",
      resolution_notes: "User warned and content edited",
    } satisfies IDiscussionBoardReport.IUpdate,
  });

  await api.functional.discussionBoard.moderator.reports.update(connection, {
    reportId: reports[4].id,
    body: {
      reviewing_moderator_id: moderator.id,
      status: "dismissed",
      resolution_notes: "No violation found",
    } satisfies IDiscussionBoardReport.IUpdate,
  });

  const pendingReports =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        status: "pending",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(pendingReports);

  TestValidator.predicate(
    "pending reports should only contain pending status",
    pendingReports.data.every((r) => r.status === "pending"),
  );

  const expectedPendingCount = reports.length - 5;
  TestValidator.equals(
    "pending reports count matches expected",
    pendingReports.data.length,
    expectedPendingCount,
  );

  const underReviewReports =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        status: "under_review",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(underReviewReports);

  TestValidator.predicate(
    "under_review reports should only contain under_review status",
    underReviewReports.data.every((r) => r.status === "under_review"),
  );

  TestValidator.equals(
    "under_review reports count is 2",
    underReviewReports.data.length,
    2,
  );

  const resolvedReports =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        status: "resolved",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(resolvedReports);

  TestValidator.predicate(
    "resolved reports should only contain resolved status",
    resolvedReports.data.every((r) => r.status === "resolved"),
  );

  TestValidator.equals(
    "resolved reports count is 2",
    resolvedReports.data.length,
    2,
  );

  const dismissedReports =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        status: "dismissed",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(dismissedReports);

  TestValidator.predicate(
    "dismissed reports should only contain dismissed status",
    dismissedReports.data.every((r) => r.status === "dismissed"),
  );

  TestValidator.equals(
    "dismissed reports count is 1",
    dismissedReports.data.length,
    1,
  );

  const allReports =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(allReports);

  TestValidator.equals(
    "total reports count matches created reports",
    allReports.data.length,
    reports.length,
  );

  const paginatedReports =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(paginatedReports);

  TestValidator.equals(
    "paginated results respect limit",
    paginatedReports.data.length,
    3,
  );

  TestValidator.predicate(
    "pagination metadata is correct",
    paginatedReports.pagination.limit === 3 &&
      paginatedReports.pagination.current === 1 &&
      paginatedReports.pagination.records === reports.length,
  );

  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "non-moderator cannot access reports queue",
    async () => {
      await api.functional.discussionBoard.moderator.reports.index(unauthConn, {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardReport.IRequest,
      });
    },
  );
}
