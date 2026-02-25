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

export async function test_api_reported_contents_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(1),
    bio: null,
    avatarUrl: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  // 2. Admin login (re-login to verify login is valid)
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies ICommunityPlatformAdmin.ILogin;
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoggedIn = await authorize_admin_login(adminLoginConnection, {
    body: adminLoginInput,
  });
  typia.assert(adminLoggedIn);
  // 3. User join
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: userJoinInput,
  });
  typia.assert(userAuthorized);
  // 4. Create report as user
  const reportCreateInput = {
    // Provide minimum viable mandatory properties using type assertion
    description: RandomGenerator.paragraph({ sentences: 2 }),
    status: "pending",
    communityPlatformUserId: userAuthorized.id,
    communityPlatformReportReasonId: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies ICommunityPlatformReport.ICreate;
  const createdReport =
    await api.functional.communityPlatform.user.reports.create(userConnection, {
      body: reportCreateInput,
    });
  typia.assert(createdReport);
  // 5. Request reported contents index with pagination and filtering
  const now = new Date();
  const createdAfter = new Date(
    now.getTime() - 1000 * 60 * 60 * 24,
  ).toISOString(); // 1 day ago
  const createdBefore = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString(); // 1 day ahead
  const paginationRequestBody: ICommunityPlatformReportedContent.IRequest = {
    createdAfter,
    createdBefore,
    page: 1,
    limit: 10,
    contentType: null,
    isDeleted: null,
  };
  const reportedContentsPage =
    await api.functional.communityPlatform.admin.reports.reportedContents.index(
      adminLoginConnection,
      {
        reportId: createdReport.id,
        body: paginationRequestBody,
      },
    );
  typia.assert(reportedContentsPage);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination.current > 0",
    reportedContentsPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination.limit > 0",
    reportedContentsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    reportedContentsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    reportedContentsPage.pagination.pages >= 0,
  );
  // Validate that all returned reported contents belong to the specified reportId
  for (const item of reportedContentsPage.data) {
    if (item.report !== null) {
      TestValidator.equals(
        "item.report.id equals requested reportId",
        item.report.id,
        createdReport.id,
      );
    }
  }
}
