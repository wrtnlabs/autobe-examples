import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_admin_reddit_community_comment_reports_search(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://test.com/admin-join",
    referrer: "https://test.com",
  } satisfies IRedditCommunityAdmin.IJoin;

  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Registered user creation and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass123!";
  const userCreateBody = {
    email: userEmail,
    password: userPassword,
  } satisfies IRedditCommunityRegisteredUser.ICreate;

  const registeredUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunityRegisteredusers.create(
      connection,
      { body: userCreateBody },
    );
  typia.assert(registeredUser);

  const registeredUserJoinBody = {
    email: userEmail,
    password: userPassword,
    ip: null,
    href: "https://test.com/user-join",
    referrer: "https://test.com",
  } satisfies IRedditCommunityRegisteredUser.ILogin;

  await api.functional.auth.registeredUser.join(connection, {
    body: userCreateBody,
  });
  // login to get tokens
  const registeredUserAuthorized: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: registeredUserJoinBody,
    });
  typia.assert(registeredUserAuthorized);

  // 3. Submit a comment report as the registered user
  const commentReportBody = {
    reason: "Inappropriate content detected",
    reddit_community_comment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityCommentReport.ICreate;

  const commentReport: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityCommentReports.create(
      connection,
      { body: commentReportBody },
    );
  typia.assert(commentReport);

  // 4. Prepare search request body for admin querying comment reports
  const searchRequestBody = {
    page: 1,
    limit: 10,
    search: undefined,
    sortBy: "created_at",
    sortOrder: "asc",
    reportedUserId: registeredUser.id,
    status: "pending",
    startDate: null,
    endDate: null,
  } satisfies IRedditCommunityCommentReport.IRequest;

  // 5. Perform admin login to set authorization for searching
  const adminLoginBody = {
    username: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://test.com/admin-login",
    referrer: "https://test.com",
  } satisfies IRedditCommunityAdmin.ILogin;

  const adminLoginAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginAuthorized);

  // 6. Query comment reports with admin
  const reportsPage: IPageIRedditCommunityCommentReport.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityCommentReports.index(
      connection,
      { body: searchRequestBody },
    );
  typia.assert(reportsPage);

  // 7. Validate returned data's pagination and contents
  TestValidator.predicate(
    "pagination current should be 1",
    reportsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    reportsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be at least 1",
    reportsPage.pagination.records >= 1,
  );

  for (const report of reportsPage.data) {
    typia.assert(report);
    // Check basic property existence and validity
    TestValidator.predicate(
      `report id should be uuid: ${report.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        report.id,
      ),
    );
    TestValidator.predicate(
      `reason should be non-empty: ${report.reason}`,
      typeof report.reason === "string" && report.reason.length > 0,
    );
    TestValidator.predicate(
      "created_at and updated_at timestamps should be ISO date-time strings",
      typeof report.created_at === "string" &&
        typeof report.updated_at === "string",
    );
    // Check nested summary properties
    typia.assert(report.comment);
    typia.assert(report.registeredUser);
  }
}
