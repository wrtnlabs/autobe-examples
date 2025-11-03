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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

export async function test_api_moderator_reports_search(
  connection: api.IConnection,
) {
  /**
   * E2E: Moderator report search and filtering
   *
   * Steps implemented:
   *
   * 1. Create a member account and authenticate (SDK sets Authorization header)
   * 2. As that member, create an article
   * 3. Create a comment under the article
   * 4. Submit two reports as the member: one for the article (Spam) and one for
   *    the comment (Harassment)
   * 5. Assert member cannot call moderator search (RBAC enforcement)
   * 6. Create a moderator account and authenticate
   * 7. As moderator, call moderator reports index with filters and assert:
   *
   *    - Typia.assert on response
   *    - Pagination meta exists and limit respects server max (<= 100)
   *    - Response.data contains the created reports according to filters
   *    - Summary does not expose reporter_session_id
   * 8. Negative cases: invalid pagination (page=0) -> expect error; unsupported
   *    sort token -> expect error
   */

  // 1) Member sign-up
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.name(1) + Date.now().toString().slice(-4),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/",
        referrer: "https://example.com/ref",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2) Create an article as member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) Create a comment under that article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parentCommentId: null,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4) Submit reports: one for article, one for comment
  const articleReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        target_type: "article",
        target_id: article.id,
        reason_category: "Spam",
        explanation: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(articleReport);

  const commentReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        target_type: "comment",
        target_id: comment.id,
        reason_category: "Harassment",
        explanation: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(commentReport);

  // 5) RBAC: member should NOT be allowed to call moderator endpoint
  await TestValidator.error(
    "member cannot access moderator report search",
    async () => {
      await api.functional.discussionBoard.moderator.reports.index(connection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardReport.IRequest,
      });
    },
  );

  // 6) Create moderator account and authenticate (SDK will set Authorization header)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username:
          RandomGenerator.name(1) + "_mod" + Date.now().toString().slice(-3),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/mod",
        referrer: "https://example.com/ref",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 7) Moderator: Search reports with filters
  const requestedLimit = 20;
  const pageResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: requestedLimit,
        targetType: "article",
        reasonCategory: "Spam",
        search: null,
        includeClosed: false,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(pageResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination present",
    pageResult.pagination !== null && pageResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "limit respects server max page size",
    pageResult.pagination.limit <= 100,
  );

  // The moderator requested targetType 'article' and reasonCategory 'Spam'
  const foundArticleReport = pageResult.data.find(
    (s) => s.targetId === article.id && s.targetType === "article",
  );
  TestValidator.predicate(
    "response contains created article report",
    foundArticleReport !== undefined,
  );

  // Summary must not expose reporter_session_id and must include expected fields
  if (foundArticleReport) {
    // reporter_session_id must not be present on summary object
    TestValidator.predicate(
      "reporter_session_id not exposed in summary",
      !Object.prototype.hasOwnProperty.call(
        foundArticleReport,
        "reporter_session_id",
      ),
    );

    // Ensure required summary fields exist
    TestValidator.predicate(
      "summary has reporterMemberId",
      (foundArticleReport.reporterMemberId !== undefined &&
        foundArticleReport.reporterMemberId !== null) ||
        foundArticleReport.reporter !== undefined,
    );
    TestValidator.predicate(
      "summary has targetType",
      foundArticleReport.targetType === "article",
    );
    TestValidator.predicate(
      "summary has targetId",
      foundArticleReport.targetId === article.id,
    );
    TestValidator.predicate(
      "summary has reasonCategory",
      foundArticleReport.reasonCategory === "Spam",
    );
    TestValidator.predicate(
      "summary has createdAt",
      !!foundArticleReport.createdAt,
    );
    TestValidator.predicate(
      "summary has explanation excerpt",
      foundArticleReport.explanationExcerpt === null ||
        typeof foundArticleReport.explanationExcerpt === "string",
    );
  }

  // Additional filtering exercise: request comments only and ensure comment report is returned
  const commentPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
        targetType: "comment",
        reasonCategory: "Harassment",
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(commentPage);
  const foundCommentReport = commentPage.data.find(
    (s) => s.targetId === comment.id && s.targetType === "comment",
  );
  TestValidator.predicate(
    "response contains created comment report",
    foundCommentReport !== undefined,
  );

  // 8) Negative cases
  // invalid page (page=0) should result in 400
  await TestValidator.error(
    "invalid page (0) should return error",
    async () => {
      await api.functional.discussionBoard.moderator.reports.index(connection, {
        body: {
          page: 0,
          limit: 10,
        } satisfies IDiscussionBoardReport.IRequest,
      });
    },
  );

  // unsupported sort token should produce 400
  await TestValidator.error(
    "unsupported sort token should return error",
    async () => {
      await api.functional.discussionBoard.moderator.reports.index(connection, {
        body: {
          page: 1,
          limit: 10,
          sortBy: "unsupported_sort",
        } satisfies IDiscussionBoardReport.IRequest,
      });
    },
  );
}
