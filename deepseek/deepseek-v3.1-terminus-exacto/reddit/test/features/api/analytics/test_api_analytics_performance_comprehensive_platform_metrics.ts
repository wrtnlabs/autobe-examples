import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_analytics_performance_comprehensive_platform_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create actor-specific connection for admin operations
  const analyticsConnection: api.IConnection = { host: connection.host };
  analyticsConnection.headers = { ...adminConnection.headers };
  // Test 1: Basic analytics request with default parameters
  const basicResponse =
    await api.functional.communityPlatform.admin.analytics.performance.index(
      analyticsConnection,
      {
        body: {} satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(basicResponse);
  TestValidator.predicate(
    "basic response has pagination",
    basicResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "basic response has data array",
    Array.isArray(basicResponse.data),
  );
  // Test 2: Date range filtering
  const currentDate = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeResponse =
    await api.functional.communityPlatform.admin.analytics.performance.index(
      analyticsConnection,
      {
        body: {
          created_at_start: oneWeekAgo,
          created_at_end: currentDate,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Test 3: Metric threshold filtering
  const thresholdResponse =
    await api.functional.communityPlatform.admin.analytics.performance.index(
      analyticsConnection,
      {
        body: {
          total_users_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          active_users_24h_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          engagement_rate_min: typia.random<
            number & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(thresholdResponse);
  // Test 4: Pagination testing
  const paginationResponse =
    await api.functional.communityPlatform.admin.analytics.performance.index(
      analyticsConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination metadata exists",
    paginationResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    paginationResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    paginationResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    paginationResponse.pagination.pages >= 0,
  );
  // Test 5: Sorting by different fields
  const sortFields = [
    "created_at",
    "total_users",
    "total_posts",
    "total_comments",
    "engagement_rate",
  ] as const;
  const sortOrders = ["asc", "desc"] as const;
  for (const field of sortFields) {
    for (const order of sortOrders) {
      const sortResponse =
        await api.functional.communityPlatform.admin.analytics.performance.index(
          analyticsConnection,
          {
            body: {
              sort_by: field,
              sort_order: order,
            } satisfies ICommunityPlatformSystemSnapshot.IRequest,
          },
        );
      typia.assert(sortResponse);
      TestValidator.predicate(
        `sort by ${field} ${order} returns data`,
        sortResponse.data.length >= 0,
      );
    }
  }
  // Test 6: Snapshot period filtering
  const snapshotPeriods = ["daily", "weekly", "monthly"] as const;
  for (const period of snapshotPeriods) {
    const periodResponse =
      await api.functional.communityPlatform.admin.analytics.performance.index(
        analyticsConnection,
        {
          body: {
            snapshot_period: period,
          } satisfies ICommunityPlatformSystemSnapshot.IRequest,
        },
      );
    typia.assert(periodResponse);
  }
  // Test 7: Complex combined filtering
  const complexResponse =
    await api.functional.communityPlatform.admin.analytics.performance.index(
      analyticsConnection,
      {
        body: {
          created_at_start: oneWeekAgo,
          total_users_min: 100,
          engagement_rate_min: 10,
          sort_by: "total_users",
          sort_order: "desc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(complexResponse);
  // Validate response structure for all metrics
  if (complexResponse.data.length > 0) {
    const snapshot = complexResponse.data[0];
    TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
    TestValidator.predicate(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
    );
    TestValidator.predicate(
      "snapshot has total_users",
      typeof snapshot.total_users === "number",
    );
    TestValidator.predicate(
      "snapshot has active_users_24h",
      typeof snapshot.active_users_24h === "number",
    );
    TestValidator.predicate(
      "snapshot has total_posts",
      typeof snapshot.total_posts === "number",
    );
    TestValidator.predicate(
      "snapshot has posts_24h",
      typeof snapshot.posts_24h === "number",
    );
    TestValidator.predicate(
      "snapshot has total_comments",
      typeof snapshot.total_comments === "number",
    );
    TestValidator.predicate(
      "snapshot has comments_24h",
      typeof snapshot.comments_24h === "number",
    );
    TestValidator.predicate(
      "snapshot has total_votes",
      typeof snapshot.total_votes === "number",
    );
    TestValidator.predicate(
      "snapshot has votes_24h",
      typeof snapshot.votes_24h === "number",
    );
    TestValidator.predicate(
      "snapshot has engagement_rate",
      typeof snapshot.engagement_rate === "number",
    );
  }
}
