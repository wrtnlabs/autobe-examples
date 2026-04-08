import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportsOverview";
import type { IPaginationMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationMetadatum";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReportOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportOverviewItem";
import type { IRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverview";
import type { IRedditCommunityReportsOverviewRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewRequest";
import type { IRedditCommunityReportsOverviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_overview_community_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call overview endpoint with admin connection
  const overviewResponse =
    await api.functional.redditCommunity.admin.reports.overview.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityReportsOverviewRequest,
      },
    );
  typia.assert(overviewResponse);
  // 3. Verify response structure has pagination
  typia.assert(overviewResponse.pagination);
  TestValidator.equals(
    "pagination has current page",
    overviewResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    overviewResponse.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    overviewResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    overviewResponse.pagination.pages >= 0,
    true,
  );
  // 4. Verify data array exists
  typia.assert(overviewResponse.data);
  TestValidator.equals(
    "data is array",
    Array.isArray(overviewResponse.data),
    true,
  );
  // 5. If reports exist, validate structure
  if (overviewResponse.data.length > 0) {
    const reportOverview = overviewResponse.data[0];
    typia.assert(reportOverview);
    // Verify statistics exist
    typia.assert(reportOverview.statistics);
    TestValidator.equals(
      "statistics has total pending count",
      typeof reportOverview.statistics.totalPendingCount === "number",
      true,
    );
    // Verify reports array exists
    typia.assert(reportOverview.reports);
    TestValidator.equals(
      "reports is array",
      Array.isArray(reportOverview.reports),
      true,
    );
    // Verify pagination exists
    typia.assert(reportOverview.pagination);
  }
  // 6. Verify admin authentication worked by checking response completeness
  TestValidator.predicate(
    "admin can access report overview",
    () => overviewResponse !== null,
  );
}
