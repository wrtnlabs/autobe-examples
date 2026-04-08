import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_post_reports_view_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // Create new connection with admin token for authenticated requests
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuth.token.access}` },
  };
  // 2. Generate test data IDs
  const testPostId1 = typia.random<string & tags.Format<"uuid">>();
  const reporterId1 = typia.random<string & tags.Format<"uuid">>();
  const reporterId2 = typia.random<string & tags.Format<"uuid">>();
  // Generate date strings for date filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 3. Test individual filters
  // Test 1: Filter by status_id
  const statusFilterId = typia.random<string & tags.Format<"uuid">>();
  const reportsByStatus =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          status_id: statusFilterId,
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsByStatus);
  TestValidator.equals(
    "status_id filter - current page",
    reportsByStatus.pagination.current,
    1,
  );
  TestValidator.equals(
    "status_id filter - limit",
    reportsByStatus.pagination.limit,
    50,
  );
  // Test 2: Filter by created_after
  const reportsRecent =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          created_after: sevenDaysAgo,
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsRecent);
  TestValidator.equals(
    "created_after filter - current page",
    reportsRecent.pagination.current,
    1,
  );
  // Test 3: Filter by reporter_id
  const reportsByReporter =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          reporter_id: reporterId1,
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsByReporter);
  TestValidator.equals(
    "reporter_id filter - current page",
    reportsByReporter.pagination.current,
    1,
  );
  // Test 4: Filter by created_before
  const reportsOld =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          created_before: oneDayAgo,
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsOld);
  TestValidator.equals(
    "created_before filter - current page",
    reportsOld.pagination.current,
    1,
  );
  // Test 5: Combined filters (status_id + created_after)
  const reportsCombined =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          status_id: statusFilterId,
          created_after: sevenDaysAgo,
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsCombined);
  TestValidator.equals(
    "combined filters - current page",
    reportsCombined.pagination.current,
    1,
  );
  // Test 6: Pagination - page=1
  const reportsPage1 =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsPage1);
  TestValidator.equals(
    "page=1 - current page",
    reportsPage1.pagination.current,
    1,
  );
  TestValidator.equals("page=1 - limit", reportsPage1.pagination.limit, 5);
  // Test 7: Pagination - page=2
  const reportsPage2 =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsPage2);
  TestValidator.equals(
    "page=2 - current page",
    reportsPage2.pagination.current,
    2,
  );
  // Test 8: Pagination - beyond total pages
  const reportsFarPage =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          page: 1000,
          limit: 20,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsFarPage);
  TestValidator.equals(
    "far page - current page",
    reportsFarPage.pagination.current,
    1000,
  );
  TestValidator.equals(
    "far page - records",
    reportsFarPage.pagination.records,
    0,
  );
  TestValidator.equals("far page - pages", reportsFarPage.pagination.pages, 0);
  // Test 9: Limit parameter variations
  const reportsLimit5 =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          limit: 5,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsLimit5);
  TestValidator.equals("limit=5 - limit", reportsLimit5.pagination.limit, 5);
  const reportsLimit100 =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          limit: 100,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsLimit100);
  TestValidator.equals(
    "limit=100 - limit",
    reportsLimit100.pagination.limit,
    100,
  );
  // Test 10: Default limit when not specified
  const reportsNoLimit =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {},
      },
    );
  typia.assert(reportsNoLimit);
  TestValidator.equals(
    "no limit - default limit",
    reportsNoLimit.pagination.limit,
    20,
  );
  // Test 11: Sort by created_at
  const reportsSorted =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          sort: "created_at",
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsSorted);
  TestValidator.equals(
    "sort=created_at - current page",
    reportsSorted.pagination.current,
    1,
  );
  // Test 12: Sort by status_id
  const reportsStatusSorted =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          sort: "status_id",
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsStatusSorted);
  TestValidator.equals(
    "sort=status_id - current page",
    reportsStatusSorted.pagination.current,
    1,
  );
  // Test 13: Empty results case
  const reportsEmpty =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          reporter_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsEmpty);
  TestValidator.equals(
    "empty results - records",
    reportsEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results - pages",
    reportsEmpty.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results - data length",
    reportsEmpty.data.length,
    0,
  );
  // Test 14: Cursor-based pagination setup
  const cursorResponse =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminAuthConnection,
      {
        postId: testPostId1,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(cursorResponse);
  // Test 15: Validate report structure when data exists
  if (reportsNoLimit.data.length > 0) {
    const sampleReport = reportsNoLimit.data[0];
    typia.assert(sampleReport);
    TestValidator.equals(
      "report has valid id",
      typeof sampleReport.id === "string",
      true,
    );
    TestValidator.equals(
      "report reporter is summary",
      !!sampleReport.reporter,
      true,
    );
    TestValidator.equals(
      "report community is summary",
      !!sampleReport.community,
      true,
    );
    TestValidator.equals(
      "report has created_at",
      typeof sampleReport.created_at === "string",
      true,
    );
  }
}
