import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityAnalytic";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunityAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_community_analytics_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(16),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph(),
        avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create admin-specific connection for authenticated calls
  const adminTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${admin.token.access}` },
  };
  // 3. Call analytics endpoint
  const analytics: IPageIRedditPlatformCommunityAnalytic.ISummary =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminTokenConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(analytics);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is valid",
    analytics.pagination.current,
    analytics.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is valid",
    analytics.pagination.limit,
    analytics.pagination.limit,
  );
  TestValidator.equals(
    "pagination records is valid",
    analytics.pagination.records,
    analytics.pagination.records,
  );
  TestValidator.equals(
    "pagination pages is valid",
    analytics.pagination.pages,
    analytics.pagination.pages,
  );
  // 5. Validate data array exists and is array type
  typia.assert(analytics.data);
  const data = analytics.data;
  TestValidator.predicate("data is array type", Array.isArray(data));
  // 6. Validate each community has required fields
  for (const community of data) {
    typia.assert(community);
    // Basic field validations
    TestValidator.equals(
      "community has community_id",
      community.community_id,
      community.community_id,
    );
    TestValidator.equals(
      "community has community_name",
      community.community_name,
      community.community_name,
    );
    TestValidator.equals(
      "community has total_reports",
      community.total_reports,
      community.total_reports,
    );
    TestValidator.equals(
      "community has resolved_reports",
      community.resolved_reports,
      community.resolved_reports,
    );
    TestValidator.equals(
      "community has dismissed_reports",
      community.dismissed_reports,
      community.dismissed_reports,
    );
    TestValidator.equals(
      "community has subscriber_count",
      community.subscriber_count,
      community.subscriber_count,
    );
    // Validate resolution_rate calculation
    if (community.total_reports > 0) {
      const expectedRate = community.resolved_reports / community.total_reports;
      TestValidator.equals(
        `resolution_rate calculation for community ${community.community_id}`,
        community.resolution_rate,
        expectedRate,
      );
      TestValidator.predicate(
        `resolution_rate between 0 and 1 for community ${community.community_id}`,
        community.resolution_rate! >= 0 && community.resolution_rate! <= 1,
      );
    } else {
      TestValidator.predicate(
        `resolution_rate is null or 0 when no reports for community ${community.community_id}`,
        community.resolution_rate === null || community.resolution_rate === 0,
      );
    }
    // Validate report counts consistency
    TestValidator.predicate(
      `resolved + dismissed <= total reports for community ${community.community_id}`,
      community.resolved_reports + community.dismissed_reports <=
        community.total_reports,
    );
  }
  // 7. Validate total pages calculation
  if (analytics.pagination.records > 0 && analytics.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      analytics.pagination.records / analytics.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation",
      analytics.pagination.pages,
      expectedPages,
    );
  }
}
