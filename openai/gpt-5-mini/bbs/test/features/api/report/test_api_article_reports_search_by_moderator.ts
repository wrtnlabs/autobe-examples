import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Validate moderator search, filtering and pagination for article-targeted
 * reports.
 *
 * Business context:
 *
 * - Multiple members file reports against the same article. Moderators must be
 *   able to search, filter and paginate these reports. Sensitive session-level
 *   fields are redacted in summaries by default. This test creates reporter
 *   accounts, files reports, then exercises moderator search and validation
 *   logic including failure cases (403 for non-moderator, 400 for malformed
 *   articleId) and empty-result handling.
 *
 * Steps:
 *
 * 1. Create three reporter member accounts (separate connections).
 * 2. Create an article by the first reporter.
 * 3. Create three reports targeting that article from different reporters with
 *    distinct reason_category values.
 * 4. Create a moderator account (separate connection).
 * 5. As moderator: retrieve reports without filters and validate pagination
 *    metadata and required summary fields.
 * 6. As moderator: validate status filter, reasonCategory filter and
 *    createdFrom/createdTo (date-range) filter.
 * 7. Negative checks: non-moderator 403, malformed articleId 400, and query for
 *    article with no reports returning empty data + valid pagination.
 */
export async function test_api_article_reports_search_by_moderator(
  connection: api.IConnection,
) {
  // 1) Create three reporter members with separate connections
  const reporterCount = 3;
  const reporters: {
    conn: api.IConnection;
    authorized: IDiscussionBoardMember.IAuthorized;
  }[] = [];

  for (let i = 0; i < reporterCount; ++i) {
    const memberConn: api.IConnection = { ...connection, headers: {} };
    const username = RandomGenerator.alphaNumeric(8);
    const email = typia.random<string & tags.Format<"email">>();
    const joinBody = {
      username,
      email,
      password: "ModeratorPass123!", // >=12 chars
      href: "https://example.com/article",
      referrer: "https://example.com/ref",
    } satisfies IDiscussionBoardMember.IJoin;

    const authorized = await api.functional.auth.member.join(memberConn, {
      body: joinBody,
    });
    typia.assert(authorized);
    reporters.push({ conn: memberConn, authorized });
  }

  // 2) Create an article by the first reporter
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      reporters[0].conn,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          state: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3) Create multiple reports against the article from different reporters
  const reasonCategories = [
    "Spam" as IDiscussionBoardReportReasonCategory,
    "Harassment" as IDiscussionBoardReportReasonCategory,
    "Other" as IDiscussionBoardReportReasonCategory,
  ] as const;

  const createdReports: IDiscussionBoardReport[] = [];
  for (let i = 0; i < reporters.length; ++i) {
    const r = reporters[i];
    const report = await api.functional.discussionBoard.member.reports.create(
      r.conn,
      {
        body: {
          target_type: "article",
          target_id: article.id,
          reason_category: reasonCategories[i % reasonCategories.length],
          explanation: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
    createdReports.push(report);
  }

  // 4) Create moderator context
  const modConn: api.IConnection = { ...connection, headers: {} };
  const modAuth = await api.functional.auth.moderator.join(modConn, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "ModeratorPass123!",
      href: "https://example.com/mod",
      referrer: "https://example.com/ref",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(modAuth);

  // 5) Moderator: retrieve paginated summaries without filters
  const pageAll: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      modConn,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(pageAll);

  // Validate pagination metadata and that at least the reports we created exist
  TestValidator.predicate(
    "pagination.records should be >= number of created reports",
    pageAll.pagination.records >= createdReports.length,
  );
  TestValidator.predicate(
    "page data should include at least one report",
    pageAll.data.length > 0,
  );

  // Each returned summary has required fields guaranteed by typia.assert;
  // do a business-level check that explanationExcerpt is present (excerpt)
  TestValidator.predicate(
    "each returned summary has explanationExcerpt or null",
    pageAll.data.every((s) => s.explanationExcerpt !== undefined),
  );

  // 6a) Filter by status (expect default 'pending')
  const pageStatus: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      modConn,
      {
        articleId: article.id,
        body: {
          status: "pending" as IDiscussionBoardReportStatus,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(pageStatus);
  TestValidator.predicate(
    "all results must have status 'pending'",
    pageStatus.data.every((d) => d.status === "pending"),
  );

  // 6b) Filter by reasonCategory (Spam)
  const pageSpam: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      modConn,
      {
        articleId: article.id,
        body: {
          reasonCategory: "Spam" as IDiscussionBoardReportReasonCategory,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(pageSpam);
  TestValidator.predicate(
    "all results must have reasonCategory 'Spam'",
    pageSpam.data.every((d) => d.reasonCategory === "Spam"),
  );

  // 6c) Date-range filter: use one created report's created_at to narrow
  const pivot = createdReports[1].created_at;
  const pageByDate: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      modConn,
      {
        articleId: article.id,
        body: {
          createdFrom: pivot,
          createdTo: pivot,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(pageByDate);
  TestValidator.predicate(
    "date-range filter results within boundaries",
    pageByDate.data.every((d) => d.createdAt >= pivot && d.createdAt <= pivot),
  );

  // 7a) Negative: non-moderator member should get 403 Forbidden
  await TestValidator.httpError(
    "non-moderator cannot access moderator reports endpoint",
    403,
    async () => {
      await api.functional.discussionBoard.moderator.articles.reports.index(
        reporters[0].conn,
        {
          articleId: article.id,
          body: { page: 1 } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    },
  );

  // 7b) Negative: malformed articleId should return 400 Bad Request
  await TestValidator.httpError(
    "malformed articleId returns 400",
    400,
    async () => {
      await api.functional.discussionBoard.moderator.articles.reports.index(
        modConn,
        {
          articleId: "not-a-uuid",
          body: { page: 1 } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    },
  );

  // 7c) Query an articleId with no reports -> expect empty data array
  const emptyArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      reporters[0].conn,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 6,
          }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          state: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(emptyArticle);

  const emptyPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      modConn,
      {
        articleId: emptyArticle.id,
        body: { page: 1, limit: 10 } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(emptyPage);

  TestValidator.equals(
    "empty article returns zero records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals("empty article data array is empty", emptyPage.data, []);
}
