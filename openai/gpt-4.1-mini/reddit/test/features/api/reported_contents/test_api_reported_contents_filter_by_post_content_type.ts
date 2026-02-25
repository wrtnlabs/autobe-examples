import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_reported_contents_filter_by_post_content_type(
  connection: api.IConnection,
): Promise<void> {
  // Admin setup: join and login to get authorized admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinBody });
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies ICommunityPlatformAdmin.ILogin;
  await authorize_admin_login(adminConnection, { body: adminLoginBody });
  // User setup: join and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // Create a report as user prerequisite
  // We create a dummy post report content for this user
  // Since ICommunityPlatformReport.ICreate type is any | any, we safely construct minimal report creation object
  // For contentType post, we must supply reported_post_id
  // Create a dummy post id
  const postId = typia.random<string & tags.Format<"uuid">>();
  const reportCreateBody = {
    contentType: "post",
    reported_post_id: postId,
    reasonText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report = await api.functional.communityPlatform.user.reports.create(
    userConnection,
    { body: reportCreateBody },
  );
  typia.assert(report);
  // Test: Admin can retrieve reportedContents filtered by post contentType
  // Create multiple reportedContents for the report
  // We assume the report already includes the link, so let's call the retrieval with filter contentType="post"
  // Paging parameters test
  const page = 1;
  const limit = 5;
  const reportedContentsResponse =
    await api.functional.communityPlatform.admin.reports.reportedContents.index(
      adminConnection,
      {
        reportId: report.id,
        body: {
          contentType: "post",
          page: page,
          limit: limit,
        },
      },
    );
  typia.assert(reportedContentsResponse);
  // Validate: All returned contents must have reportedPost that is not null
  for (const content of reportedContentsResponse.data) {
    TestValidator.predicate(
      `reportedContent ${content.id} has reportedPost`,
      content.reportedPost !== null,
    );
    TestValidator.equals(
      `reportedContent ${content.id} reportId matches`,
      content.report?.id,
      report.id,
    );
  }
  await TestValidator.predicate(
    "pagination current page is correct",
    reportedContentsResponse.pagination.current === page,
  );
  await TestValidator.predicate(
    "pagination limit is correct",
    reportedContentsResponse.pagination.limit === limit,
  );
  // Test: If no reported contents exist for a given reportId with contentType 'post', the response data should be empty array
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  const emptyResponse =
    await api.functional.communityPlatform.admin.reports.reportedContents.index(
      adminConnection,
      {
        reportId: nonExistentReportId,
        body: {
          contentType: "post",
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals("empty response data array", emptyResponse.data, []);
  // Test authorization: unauthorized user (userConnection) cannot access this endpoint
  await TestValidator.httpError(
    "unauthorized user cannot access admin reportedContents index",
    403,
    async () => {
      await api.functional.communityPlatform.admin.reports.reportedContents.index(
        userConnection,
        {
          reportId: report.id,
          body: { contentType: "post" },
        },
      );
    },
  );
}
