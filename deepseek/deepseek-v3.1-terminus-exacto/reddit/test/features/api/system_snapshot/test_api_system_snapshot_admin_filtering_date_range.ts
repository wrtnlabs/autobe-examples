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
 * Test system snapshot retrieval with date range filtering for administrative analytics.
 * Verifies that administrators can filter platform metrics by creation date ranges
 * and receive properly paginated results with complete platform statistics.
 */
export async function test_api_system_snapshot_admin_filtering_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account and connection
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
  // Define date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const created_at_start = thirtyDaysAgo.toISOString();
  const created_at_end = now.toISOString();
  // Test date range filtering
  const response =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_start,
          created_at_end,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sort_by: "created_at" as const,
          sort_order: "desc" as const,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination structure",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page positive",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit within bounds",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // Validate each snapshot in the response
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    // Validate snapshot creation date is within the specified range
    const snapshotDate = new Date(snapshot.created_at);
    const startDate = new Date(created_at_start);
    const endDate = new Date(created_at_end);
    TestValidator.predicate(
      "snapshot date within range",
      snapshotDate >= startDate && snapshotDate <= endDate,
    );
    // Validate all required platform metrics exist
    TestValidator.predicate(
      "has total_users",
      typeof snapshot.total_users === "number",
    );
    TestValidator.predicate(
      "has active_users_24h",
      typeof snapshot.active_users_24h === "number",
    );
    TestValidator.predicate(
      "has total_posts",
      typeof snapshot.total_posts === "number",
    );
    TestValidator.predicate(
      "has posts_24h",
      typeof snapshot.posts_24h === "number",
    );
    TestValidator.predicate(
      "has total_comments",
      typeof snapshot.total_comments === "number",
    );
    TestValidator.predicate(
      "has comments_24h",
      typeof snapshot.comments_24h === "number",
    );
    TestValidator.predicate(
      "has total_votes",
      typeof snapshot.total_votes === "number",
    );
    TestValidator.predicate(
      "has votes_24h",
      typeof snapshot.votes_24h === "number",
    );
    TestValidator.predicate(
      "has engagement_rate",
      typeof snapshot.engagement_rate === "number",
    );
    // Validate metric ranges
    TestValidator.predicate(
      "total_users non-negative",
      snapshot.total_users >= 0,
    );
    TestValidator.predicate(
      "active_users_24h non-negative",
      snapshot.active_users_24h >= 0,
    );
    TestValidator.predicate(
      "total_posts non-negative",
      snapshot.total_posts >= 0,
    );
    TestValidator.predicate("posts_24h non-negative", snapshot.posts_24h >= 0);
    TestValidator.predicate(
      "total_comments non-negative",
      snapshot.total_comments >= 0,
    );
    TestValidator.predicate(
      "comments_24h non-negative",
      snapshot.comments_24h >= 0,
    );
    TestValidator.predicate(
      "total_votes non-negative",
      snapshot.total_votes >= 0,
    );
    TestValidator.predicate("votes_24h non-negative", snapshot.votes_24h >= 0);
    TestValidator.predicate(
      "engagement_rate valid",
      snapshot.engagement_rate >= 0 && snapshot.engagement_rate <= 100,
    );
  }
  // Test empty date range (should return empty or all results)
  const emptyRangeResponse =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_start: undefined,
          created_at_end: undefined,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(emptyRangeResponse);
  TestValidator.equals(
    "empty range pagination structure",
    typeof emptyRangeResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "empty range data is array",
    Array.isArray(emptyRangeResponse.data),
  );
}
