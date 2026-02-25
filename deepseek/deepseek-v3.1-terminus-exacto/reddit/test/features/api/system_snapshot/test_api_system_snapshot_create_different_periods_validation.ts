import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_system_snapshots_create } from "../../../generate/generate_random_community_platform_admin_system_snapshots_create";
import { prepare_random_community_platform_system_snapshot } from "../../../prepare/prepare_random_community_platform_system_snapshot";

export async function test_api_system_snapshot_create_different_periods_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create base metrics data that will be used for all snapshots
  // Note: snapshot_period is required by ICreate interface but will be overridden
  const baseMetrics: ICommunityPlatformSystemSnapshot.ICreate = {
    total_users: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    active_users_24h: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    active_users_7d: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    active_users_30d: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    total_communities: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    active_communities: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    total_posts: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    posts_24h: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    posts_7d: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    total_comments: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    comments_24h: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    comments_7d: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    total_votes: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    votes_24h: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    votes_7d: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    total_subscriptions: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    new_subscriptions_24h: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    avg_posts_per_user: typia.random<number & tags.Minimum<0>>(),
    avg_comments_per_user: typia.random<number & tags.Minimum<0>>(),
    avg_votes_per_user: typia.random<number & tags.Minimum<0>>(),
    user_growth_rate: typia.random<number>(),
    content_growth_rate: typia.random<number>(),
    engagement_rate: typia.random<number>(),
    peak_concurrent_users: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    avg_session_duration: typia.random<number & tags.Minimum<0>>(),
    bounce_rate: typia.random<number>(),
    retention_rate_7d: typia.random<number>(),
    retention_rate_30d: typia.random<number>(),
    moderation_actions_24h: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    reports_resolved_24h: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    system_uptime_percentage: typia.random<number>(),
    avg_response_time: typia.random<number & tags.Minimum<0>>(),
    error_rate: typia.random<number>(),
    snapshot_period: "daily", // Required field, will be overridden
    snapshot_notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformSystemSnapshot.ICreate;
  // Test daily snapshot using utility function
  const dailySnapshot =
    await generate_random_community_platform_admin_system_snapshots_create(
      adminConnection,
      {
        body: {
          ...baseMetrics,
          snapshot_period: "daily",
        } satisfies ICommunityPlatformSystemSnapshot.ICreate,
      },
    );
  typia.assert(dailySnapshot);
  TestValidator.equals(
    "daily snapshot period",
    dailySnapshot.snapshot_period,
    "daily",
  );
  // Test weekly snapshot using utility function
  const weeklySnapshot =
    await generate_random_community_platform_admin_system_snapshots_create(
      adminConnection,
      {
        body: {
          ...baseMetrics,
          snapshot_period: "weekly",
        } satisfies ICommunityPlatformSystemSnapshot.ICreate,
      },
    );
  typia.assert(weeklySnapshot);
  TestValidator.equals(
    "weekly snapshot period",
    weeklySnapshot.snapshot_period,
    "weekly",
  );
  // Test monthly snapshot using utility function
  const monthlySnapshot =
    await generate_random_community_platform_admin_system_snapshots_create(
      adminConnection,
      {
        body: {
          ...baseMetrics,
          snapshot_period: "monthly",
        } satisfies ICommunityPlatformSystemSnapshot.ICreate,
      },
    );
  typia.assert(monthlySnapshot);
  TestValidator.equals(
    "monthly snapshot period",
    monthlySnapshot.snapshot_period,
    "monthly",
  );
  // Validate that all snapshots have unique IDs
  TestValidator.notEquals(
    "daily and weekly IDs differ",
    dailySnapshot.id,
    weeklySnapshot.id,
  );
  TestValidator.notEquals(
    "daily and monthly IDs differ",
    dailySnapshot.id,
    monthlySnapshot.id,
  );
  TestValidator.notEquals(
    "weekly and monthly IDs differ",
    weeklySnapshot.id,
    monthlySnapshot.id,
  );
  // Validate that metrics are preserved correctly across different periods
  // Use simple number comparison to avoid type tag conflicts
  TestValidator.equals(
    "total users preserved in daily snapshot",
    dailySnapshot.total_users,
    baseMetrics.total_users satisfies number as number,
  );
  TestValidator.equals(
    "total users preserved in weekly snapshot",
    weeklySnapshot.total_users,
    baseMetrics.total_users satisfies number as number,
  );
  TestValidator.equals(
    "total users preserved in monthly snapshot",
    monthlySnapshot.total_users,
    baseMetrics.total_users satisfies number as number,
  );
}
