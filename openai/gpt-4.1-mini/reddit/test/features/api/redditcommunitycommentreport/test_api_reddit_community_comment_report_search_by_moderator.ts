import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_comment_report_search_by_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator via join operation to establish auth context.
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "validPassword123",
      } satisfies IRedditCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a registered user to act as reference in comment reports.
  const registeredUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const registeredUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunityRegisteredusers.create(
      connection,
      {
        body: {
          email: registeredUserEmail,
          password: "userPassword123",
        } satisfies IRedditCommunityRegisteredUser.ICreate,
      },
    );
  typia.assert(registeredUser);

  // 3. Search paginated reddit community comment reports with filtering.
  const commentReportRequest: IRedditCommunityCommentReport.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
    reportedUserId: registeredUser.id,
    status: "pending",
    search: undefined,
    startDate: null,
    endDate: null,
  };

  const pagedReports: IPageIRedditCommunityCommentReport.ISummary =
    await api.functional.redditCommunity.moderator.redditCommunityCommentReports.index(
      connection,
      { body: commentReportRequest },
    );
  typia.assert(pagedReports);

  // Basic validation on the pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    () => pagedReports.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    () => pagedReports.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => pagedReports.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => pagedReports.pagination.records >= 0,
  );

  // Validate each report has referenced comment and registered user summaries
  for (const report of pagedReports.data) {
    typia.assert(report);
    typia.assert(report.comment);
    typia.assert(report.registeredUser);
    TestValidator.predicate(
      "report status is string",
      () => typeof report.reason === "string",
    );
  }
}
