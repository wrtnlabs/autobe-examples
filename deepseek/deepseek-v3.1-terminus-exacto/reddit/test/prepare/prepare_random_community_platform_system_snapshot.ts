import { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_system_snapshot(
  input?: DeepPartial<ICommunityPlatformSystemSnapshot.ICreate>,
): ICommunityPlatformSystemSnapshot.ICreate {
  return {
    total_users:
      input?.total_users ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000000>
      >(),
    active_users_24h:
      input?.active_users_24h ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100000>
      >(),
    active_users_7d:
      input?.active_users_7d ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<200000>
      >(),
    active_users_30d:
      input?.active_users_30d ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500000>
      >(),
    total_communities:
      input?.total_communities ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<10000>
      >(),
    active_communities:
      input?.active_communities ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5000>
      >(),
    total_posts:
      input?.total_posts ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
      >(),
    posts_24h:
      input?.posts_24h ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<50000>
      >(),
    posts_7d:
      input?.posts_7d ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<200000>
      >(),
    total_comments:
      input?.total_comments ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<5000> &
          tags.Maximum<10000000>
      >(),
    comments_24h:
      input?.comments_24h ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100000>
      >(),
    comments_7d:
      input?.comments_7d ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500000>
      >(),
    total_votes:
      input?.total_votes ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<10000> &
          tags.Maximum<50000000>
      >(),
    votes_24h:
      input?.votes_24h ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500000>
      >(),
    votes_7d:
      input?.votes_7d ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<2000000>
      >(),
    total_subscriptions:
      input?.total_subscriptions ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<5000> &
          tags.Maximum<20000000>
      >(),
    new_subscriptions_24h:
      input?.new_subscriptions_24h ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<50000>
      >(),
    avg_posts_per_user:
      input?.avg_posts_per_user ??
      typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
    avg_comments_per_user:
      input?.avg_comments_per_user ??
      typia.random<number & tags.Minimum<0.5> & tags.Maximum<200>>(),
    avg_votes_per_user:
      input?.avg_votes_per_user ??
      typia.random<number & tags.Minimum<1> & tags.Maximum<500>>(),
    user_growth_rate:
      input?.user_growth_rate ??
      typia.random<number & tags.Minimum<-10> & tags.Maximum<50>>(),
    content_growth_rate:
      input?.content_growth_rate ??
      typia.random<number & tags.Minimum<-20> & tags.Maximum<100>>(),
    engagement_rate:
      input?.engagement_rate ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
    peak_concurrent_users:
      input?.peak_concurrent_users ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<50000>
      >(),
    avg_session_duration:
      input?.avg_session_duration ??
      typia.random<number & tags.Minimum<1> & tags.Maximum<120>>(),
    bounce_rate:
      input?.bounce_rate ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<80>>(),
    retention_rate_7d:
      input?.retention_rate_7d ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
    retention_rate_30d:
      input?.retention_rate_30d ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
    moderation_actions_24h:
      input?.moderation_actions_24h ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10000>
      >(),
    reports_resolved_24h:
      input?.reports_resolved_24h ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5000>
      >(),
    system_uptime_percentage:
      input?.system_uptime_percentage ??
      typia.random<number & tags.Minimum<90> & tags.Maximum<100>>(),
    avg_response_time:
      input?.avg_response_time ??
      typia.random<number & tags.Minimum<50> & tags.Maximum<2000>>(),
    error_rate:
      input?.error_rate ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<5>>(),
    snapshot_period:
      input?.snapshot_period ??
      RandomGenerator.pick(["daily", "weekly", "monthly"] as const),
    snapshot_notes:
      input?.snapshot_notes ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
