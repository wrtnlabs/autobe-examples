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

export async function test_api_system_snapshot_create_with_historical_notes(
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
  // Prepare comprehensive snapshot data with historical notes
  const snapshotData: ICommunityPlatformSystemSnapshot.ICreate = {
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
    engagement_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
    peak_concurrent_users: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    avg_session_duration: typia.random<number & tags.Minimum<0>>(),
    bounce_rate: typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
    retention_rate_7d: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
    retention_rate_30d: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
    moderation_actions_24h: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    reports_resolved_24h: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    system_uptime_percentage: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
    avg_response_time: typia.random<number & tags.Minimum<0>>(),
    error_rate: typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
    snapshot_period: RandomGenerator.pick([
      "daily",
      "weekly",
      "monthly",
    ] as const),
    snapshot_notes: RandomGenerator.paragraph({ sentences: 3 }),
  };
  // Create the system snapshot
  const snapshot =
    await generate_random_community_platform_admin_system_snapshots_create(
      adminConnection,
      { body: snapshotData },
    );
  typia.assert(snapshot);
  // Validate business logic - notes preservation and data integrity
  TestValidator.equals(
    "notes preserved",
    snapshot.snapshot_notes,
    snapshotData.snapshot_notes,
  );
  TestValidator.equals(
    "total users match",
    snapshot.total_users,
    snapshotData.total_users satisfies number as number,
  );
  TestValidator.equals(
    "snapshot period match",
    snapshot.snapshot_period,
    snapshotData.snapshot_period,
  );
}