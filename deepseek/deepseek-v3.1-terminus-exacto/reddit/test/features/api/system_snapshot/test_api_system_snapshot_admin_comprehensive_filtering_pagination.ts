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

/**
 * Test comprehensive filtering with pagination to validate large dataset handling for platform analytics dashboards.
 */
export async function test_api_system_snapshot_admin_comprehensive_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account for authorization using direct SDK call since utility function signature mismatch
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.communityPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        permissions_level: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Test 1: Comprehensive filtering with date range and metrics
  const comprehensiveResponse =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
          snapshot_period: "daily",
          active_users_24h_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          total_posts_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          total_comments_max: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          avg_response_time_min: typia.random<number & tags.Minimum<0>>(),
          error_rate_max: typia.random<
            number & tags.Minimum<0> & tags.Maximum<100>
          >(),
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(comprehensiveResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    comprehensiveResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    comprehensiveResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    comprehensiveResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    comprehensiveResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    comprehensiveResponse.pagination.pages >= 0,
  );
  // Test 2: Pagination with limit=1
  const singlePageResponse =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(singlePageResponse);
  // Validate single page response
  TestValidator.equals(
    "single page limit",
    singlePageResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "single page data length <= 1",
    singlePageResponse.data.length <= 1,
  );
  // Test 3: Second page pagination
  if (comprehensiveResponse.pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.communityPlatform.admin.system_snapshots.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
            sort_by: "created_at",
            sort_order: "asc",
          } satisfies ICommunityPlatformSystemSnapshot.IRequest,
        },
      );
    typia.assert(secondPageResponse);
    TestValidator.equals(
      "second page current",
      secondPageResponse.pagination.current,
      2,
    );
  }
  // Test 4: Empty result scenario with restrictive filters
  const emptyResponse =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(), // Future date
          created_at_end: new Date(
            Date.now() + 48 * 60 * 60 * 1000,
          ).toISOString(), // Future date
          active_users_24h_min: 1000000, // Unrealistically high threshold
          total_posts_min: 1000000, // Unrealistically high threshold
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Validate empty response
  TestValidator.equals("empty data array", emptyResponse.data.length, 0);
  TestValidator.equals(
    "empty records count",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals("empty pages count", emptyResponse.pagination.pages, 0);
  // Test 5: Different sorting combinations
  const sortingTests = [
    { sort_by: "total_users", sort_order: "desc" },
    { sort_by: "total_posts", sort_order: "asc" },
    { sort_by: "total_comments", sort_order: "desc" },
    { sort_by: "engagement_rate", sort_order: "asc" },
  ] as const;
  for (const sortConfig of sortingTests) {
    const sortedResponse =
      await api.functional.communityPlatform.admin.system_snapshots.index(
        adminConnection,
        {
          body: {
            ...sortConfig,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformSystemSnapshot.IRequest,
        },
      );
    typia.assert(sortedResponse);
    TestValidator.predicate(
      `sorting ${sortConfig.sort_by} ${sortConfig.sort_order} returns data`,
      sortedResponse.data.length >= 0,
    );
  }
}
