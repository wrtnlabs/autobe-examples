import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Test filtering content reports by content type (article or comment).
 *
 * Moderator authenticates and requests reports filtered by contentType
 * parameter to show only article reports or only comment reports. Validates
 * that the contentType filter works correctly by comparing filtered results
 * with unfiltered results, ensuring filtering reduces the result set
 * appropriately. Verifies pagination parameters are correct for filtered
 * results and validates report structure.
 *
 * Test workflow:
 *
 * 1. Moderator joins and authenticates
 * 2. Request all reports without contentType filter (baseline)
 * 3. Request reports filtered by contentType="article"
 * 4. Request reports filtered by contentType="comment"
 * 5. Validate that article + comment totals are consistent
 * 6. Verify pagination metadata is correct for each filtered result
 * 7. Validate report structure and data integrity
 */
export async function test_api_content_reports_filter_by_content_type(
  connection: api.IConnection,
) {
  // 1. Moderator joins and authenticates
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .toLowerCase()
          .substring(0, 50),
        username: RandomGenerator.alphabets(12),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.id !== undefined && moderator.token.access !== undefined,
  );

  // 2. Request all reports without contentType filter (baseline)
  const allReports: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.predicate(
    "all reports pagination should have valid structure",
    allReports.pagination.current >= 0 &&
      allReports.pagination.limit >= 0 &&
      allReports.pagination.records >= 0 &&
      allReports.pagination.pages >= 0,
  );

  // 3. Request reports filtered by contentType="article"
  const articleReports: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          contentType: "article",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(articleReports);
  TestValidator.predicate(
    "article reports pagination should be valid",
    articleReports.pagination.current >= 0 &&
      articleReports.pagination.limit >= 0 &&
      articleReports.pagination.records >= 0,
  );

  // 4. Request reports filtered by contentType="comment"
  const commentReports: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          contentType: "comment",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(commentReports);
  TestValidator.predicate(
    "comment reports pagination should be valid",
    commentReports.pagination.current >= 0 &&
      commentReports.pagination.limit >= 0 &&
      commentReports.pagination.records >= 0,
  );

  // 5. Validate that article + comment totals are consistent
  const totalFilteredRecords =
    articleReports.pagination.records + commentReports.pagination.records;
  TestValidator.predicate(
    "filtered totals should not exceed unfiltered total",
    totalFilteredRecords <= allReports.pagination.records,
  );

  // 6. Verify pagination metadata is correct for filtered results
  TestValidator.equals(
    "article reports current page should be 1",
    articleReports.pagination.current,
    1,
  );
  TestValidator.equals(
    "comment reports current page should be 1",
    commentReports.pagination.current,
    1,
  );
  TestValidator.predicate(
    "article reports should have correct data array length",
    articleReports.data.length <=
      Math.min(
        articleReports.pagination.limit,
        articleReports.pagination.records,
      ),
  );
  TestValidator.predicate(
    "comment reports should have correct data array length",
    commentReports.data.length <=
      Math.min(
        commentReports.pagination.limit,
        commentReports.pagination.records,
      ),
  );

  // 7. Validate report structure and data integrity
  if (articleReports.data.length > 0) {
    const sampleArticleReport = articleReports.data[0];
    typia.assert(sampleArticleReport);
    TestValidator.predicate(
      "article report should have valid id",
      sampleArticleReport.id !== undefined && sampleArticleReport.id.length > 0,
    );
    TestValidator.predicate(
      "article report should have reason",
      sampleArticleReport.reason !== undefined,
    );
    TestValidator.predicate(
      "article report should have status",
      sampleArticleReport.status !== undefined,
    );
    TestValidator.predicate(
      "article report should have created_at timestamp",
      sampleArticleReport.created_at !== undefined,
    );
    TestValidator.predicate(
      "article report should have reporter info",
      sampleArticleReport.reporter !== undefined &&
        sampleArticleReport.reporter.id !== undefined,
    );
  }

  if (commentReports.data.length > 0) {
    const sampleCommentReport = commentReports.data[0];
    typia.assert(sampleCommentReport);
    TestValidator.predicate(
      "comment report should have valid id",
      sampleCommentReport.id !== undefined && sampleCommentReport.id.length > 0,
    );
    TestValidator.predicate(
      "comment report should have reason",
      sampleCommentReport.reason !== undefined,
    );
    TestValidator.predicate(
      "comment report should have status",
      sampleCommentReport.status !== undefined,
    );
    TestValidator.predicate(
      "comment report should have created_at timestamp",
      sampleCommentReport.created_at !== undefined,
    );
    TestValidator.predicate(
      "comment report should have reporter info",
      sampleCommentReport.reporter !== undefined &&
        sampleCommentReport.reporter.id !== undefined,
    );
  }
}
