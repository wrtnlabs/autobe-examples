import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_analytics_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create separate connection for authorization
  const authConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 2. Create moderator-specific connection for analytics
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: moderator.token.access },
  };
  // 3. Calculate date range for last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // 4. Set up advanced filtering criteria
  const analyticsRequest = {
    created_at_start: sevenDaysAgo.toISOString(),
    created_at_end: now.toISOString(),
    snapshot_period: "daily",
    total_users_min: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100>
    >(),
    active_users_24h_min: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<50>
    >(),
    total_posts_min: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<200>
    >(),
    total_comments_min: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<500>
    >(),
    engagement_rate_min: typia.random<
      number & tags.Minimum<10> & tags.Maximum<100>
    >(),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
    >(),
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies ICommunityPlatformSystemSnapshot.IRequest;
  // 5. Call analytics endpoint with advanced filtering
  const response =
    await api.functional.communityPlatform.moderator.analytics.index(
      moderatorConnection,
      { body: analyticsRequest },
    );
  typia.assert(response);
  // 6. Validate response structure
  TestValidator.equals(
    "response has pagination",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  // 7. Test that filtered results meet specified criteria
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    // Verify date range filtering
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot within date range",
      snapshotDate >= sevenDaysAgo && snapshotDate <= now,
    );
    // Verify metric thresholds (handle nullable values)
    if (analyticsRequest.total_users_min !== undefined) {
      TestValidator.predicate(
        "meets total users minimum",
        snapshot.total_users >= analyticsRequest.total_users_min,
      );
    }
    if (analyticsRequest.active_users_24h_min !== undefined) {
      TestValidator.predicate(
        "meets active users minimum",
        snapshot.active_users_24h >= analyticsRequest.active_users_24h_min,
      );
    }
    if (analyticsRequest.total_posts_min !== undefined) {
      TestValidator.predicate(
        "meets total posts minimum",
        snapshot.total_posts >= analyticsRequest.total_posts_min,
      );
    }
    if (analyticsRequest.total_comments_min !== undefined) {
      TestValidator.predicate(
        "meets total comments minimum",
        snapshot.total_comments >= analyticsRequest.total_comments_min,
      );
    }
    if (analyticsRequest.engagement_rate_min !== undefined) {
      TestValidator.predicate(
        "meets engagement rate minimum",
        snapshot.engagement_rate >= analyticsRequest.engagement_rate_min,
      );
    }
  }
  // 8. Test pagination functionality
  TestValidator.predicate(
    "pagination current page valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count valid",
    response.pagination.pages >= 0,
  );
  // 9. Verify data array size matches pagination
  TestValidator.predicate(
    "data size matches pagination limit",
    response.data.length <= response.pagination.limit,
  );
}
