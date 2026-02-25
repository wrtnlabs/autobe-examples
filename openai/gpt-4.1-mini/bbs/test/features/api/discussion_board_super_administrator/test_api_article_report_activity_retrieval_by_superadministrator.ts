import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleReportActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReportActivity";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_article_report_activity_retrieval_by_superadministrator(
  connection: api.IConnection,
): Promise<void> {
  // Test that a superAdministrator user can successfully retrieve aggregated article report activity data, including total reports, resolved reports, and pending reports. The test should verify the response structure and data consistency according to the business rules. Unauthorized users must not access this endpoint.
  // 1. Create a new connection for superAdministrator and register a new superAdministrator user
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  // Update the super administrator connection headers with the Authorization token
  superAdminConnection.headers = {
    ...(superAdminConnection.headers ?? {}),
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Authenticated superAdministrator calls the article report activity endpoint
  const activity =
    await api.functional.discussionBoard.superAdministrator.article_reports.activity.getArticleReportsActivity(
      superAdminConnection,
    );
  // 3. Validate the response structure
  typia.assert(activity);
  // 4. Business logic validation: totalReports must equal resolvedReports + pendingReports
  TestValidator.equals(
    "totalReports equals resolvedReports plus pendingReports",
    activity.totalReports,
    activity.resolvedReports + activity.pendingReports,
  );
  // 5. Unauthorized access check - using base connection without token
  await TestValidator.httpError("unauthorized access denied", 401, async () => {
    await api.functional.discussionBoard.superAdministrator.article_reports.activity.getArticleReportsActivity(
      connection,
    );
  });
}
