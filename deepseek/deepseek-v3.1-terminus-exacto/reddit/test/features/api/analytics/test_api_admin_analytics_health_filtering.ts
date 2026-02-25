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

export async function test_api_admin_analytics_health_filtering(
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
  // Test 1: Basic filtering with time range
  const basicFilterResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(basicFilterResponse);
  TestValidator.equals(
    "basic filter has pagination",
    typeof basicFilterResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    basicFilterResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicFilterResponse.pagination.limit > 0,
  );
  // Test 2: User metrics filtering
  const userMetricsResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          total_users_min: 0,
          total_users_max: 1000,
          active_users_24h_min: 0,
          active_users_24h_max: 500,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(userMetricsResponse);
  // Test 3: Content metrics filtering
  const contentMetricsResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          total_posts_min: 0,
          total_posts_max: 10000,
          total_comments_min: 0,
          total_comments_max: 50000,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(contentMetricsResponse);
  // Test 4: Performance metrics filtering
  const performanceResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          engagement_rate_min: 0,
          engagement_rate_max: 100,
          avg_response_time_min: 0,
          avg_response_time_max: 1000,
          error_rate_min: 0,
          error_rate_max: 10,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(performanceResponse);
  // Test 5: Combined filtering with sorting
  const combinedResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          total_users_min: 10,
          total_posts_min: 100,
          engagement_rate_min: 5,
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Test 6: Unauthorized access attempt - create proper unauthorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.communityPlatform.admin.analytics.health.index(
      unauthorizedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  });
  // Validate pagination structure completeness
  TestValidator.predicate(
    "pagination has records",
    typeof basicFilterResponse.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof basicFilterResponse.pagination.pages === "number",
  );
  TestValidator.predicate(
    "records is non-negative",
    basicFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    basicFilterResponse.pagination.pages >= 0,
  );
  // Validate snapshot data structure when data exists
  if (basicFilterResponse.data.length > 0) {
    const snapshot = basicFilterResponse.data[0];
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
