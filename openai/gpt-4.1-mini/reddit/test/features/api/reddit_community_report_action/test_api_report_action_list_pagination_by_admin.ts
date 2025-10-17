import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportAction";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";

export async function test_api_report_action_list_pagination_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Login as admin user
  const adminLoggedIn: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 3. Create a new report status
  const reportStatusCreateBody = {
    name: "pending",
    description: "Reports awaiting review",
  } satisfies IRedditCommunityReportStatus.ICreate;
  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: reportStatusCreateBody,
      },
    );
  typia.assert(reportStatus);

  // 4. Create a content report with the created status
  const contentReportCreateBody = {
    status_id: reportStatus.id,
    category: "spam",
    description: "Spam post content",
  } satisfies IRedditCommunityReport.ICreate;
  const contentReport: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: contentReportCreateBody,
    });
  typia.assert(contentReport);

  // 5. Request paginated report actions list for the report
  const reportActionsRequestBody = {
    page: 1,
    limit: 10,
    filterReportId: contentReport.id,
    sortBy: "created_at",
    order: "asc",
  } satisfies IRedditCommunityReportAction.IRequest;
  const reportActionsPage: IPageIRedditCommunityReportAction =
    await api.functional.redditCommunity.admin.reports.reportActions.searchReportActionsByReportId(
      connection,
      {
        reportId: contentReport.id,
        body: reportActionsRequestBody,
      },
    );
  typia.assert(reportActionsPage);
}
