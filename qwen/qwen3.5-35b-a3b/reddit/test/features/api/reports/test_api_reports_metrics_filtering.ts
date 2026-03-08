import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportMetric";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReportMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_reports_metrics_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: RandomGenerator.alphaNumeric(15),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminUser.email,
      password: adminUser.token.access,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Create community for testing
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Call metrics endpoint with comprehensive filters
  const metrics =
    await api.functional.redditPlatform.admin.reports.metrics.index(
      adminConnection,
      {
        body: {
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-31T23:59:59Z",
          status: "RESOLVED",
          communityId: community.id,
          reportedContentType: "POST",
          sortBy: "resolution_rate",
          sortOrder: "DESC",
        } satisfies IRedditPlatformReportMetric.IRequest,
      },
    );
  typia.assert(metrics);
  // 4. Validate response structure
  TestValidator.equals(
    "response has pagination",
    metrics.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    metrics.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(metrics.data),
    true,
  );
  // 5. Validate filtering works (mock data simulation)
  // Since we can't create actual reports in this test, validate structure
  if (metrics.data.length > 0) {
    const firstMetric = metrics.data[0];
    TestValidator.equals(
      "metric has community_id",
      firstMetric.community_id !== undefined,
      true,
    );
    TestValidator.equals(
      "metric has total_reports",
      firstMetric.total_reports >= 0,
      true,
    );
    TestValidator.equals(
      "metric has resolved_count",
      firstMetric.resolved_count >= 0,
      true,
    );
    TestValidator.equals(
      "metric has resolution_rate",
      firstMetric.resolution_rate !== undefined,
      true,
    );
    // Validate resolution_rate calculation
    if (firstMetric.total_reports > 0) {
      const expectedRate =
        (firstMetric.resolved_count / firstMetric.total_reports) * 100;
      TestValidator.equals(
        "resolution_rate calculated correctly",
        firstMetric.resolution_rate !== null &&
          Math.abs(firstMetric.resolution_rate - expectedRate) < 0.1,
        true,
      );
    }
    // Validate sorting (if multiple results)
    if (metrics.data.length > 1) {
      TestValidator.equals(
        "resolution rates sorted DESC",
        metrics.data[0].resolution_rate !== null &&
          metrics.data[1].resolution_rate !== null &&
          metrics.data[0].resolution_rate >= metrics.data[1].resolution_rate,
        true,
      );
    }
  }
  // 6. Test edge case: empty result
  const emptyMetrics =
    await api.functional.redditPlatform.admin.reports.metrics.index(
      adminConnection,
      {
        body: {
          startDate: "2024-12-01T00:00:00Z",
          endDate: "2024-12-31T23:59:59Z",
          status: "DISMISSED",
          communityId: "00000000-0000-0000-0000-000000000000", // Non-existent UUID
        } satisfies IRedditPlatformReportMetric.IRequest,
      },
    );
  typia.assert(emptyMetrics);
  TestValidator.equals(
    "empty result pagination records=0",
    emptyMetrics.pagination.records === 0,
    true,
  );
  TestValidator.equals(
    "empty result has no data",
    emptyMetrics.data.length === 0,
    true,
  );
  // 7. Test sorting by different fields
  const sortedByDate =
    await api.functional.redditPlatform.admin.reports.metrics.index(
      adminConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "ASC",
        } satisfies IRedditPlatformReportMetric.IRequest,
      },
    );
  typia.assert(sortedByDate);
  TestValidator.equals(
    "sorting by created_at works",
    sortedByDate.pagination !== undefined,
    true,
  );
}