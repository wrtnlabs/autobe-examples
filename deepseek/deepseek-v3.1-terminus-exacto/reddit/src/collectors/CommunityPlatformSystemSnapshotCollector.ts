import { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformSystemSnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformSystemSnapshot.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      total_users: props.body.total_users,
      active_users_24h: props.body.active_users_24h,
      active_users_7d: props.body.active_users_7d,
      active_users_30d: props.body.active_users_30d,
      total_communities: props.body.total_communities,
      active_communities: props.body.active_communities,
      total_posts: props.body.total_posts,
      posts_24h: props.body.posts_24h,
      posts_7d: props.body.posts_7d,
      total_comments: props.body.total_comments,
      comments_24h: props.body.comments_24h,
      comments_7d: props.body.comments_7d,
      total_votes: props.body.total_votes,
      votes_24h: props.body.votes_24h,
      votes_7d: props.body.votes_7d,
      total_subscriptions: props.body.total_subscriptions,
      new_subscriptions_24h: props.body.new_subscriptions_24h,
      avg_posts_per_user: props.body.avg_posts_per_user,
      avg_comments_per_user: props.body.avg_comments_per_user,
      avg_votes_per_user: props.body.avg_votes_per_user,
      user_growth_rate: props.body.user_growth_rate,
      content_growth_rate: props.body.content_growth_rate,
      engagement_rate: props.body.engagement_rate,
      peak_concurrent_users: props.body.peak_concurrent_users,
      avg_session_duration: props.body.avg_session_duration,
      bounce_rate: props.body.bounce_rate,
      retention_rate_7d: props.body.retention_rate_7d,
      retention_rate_30d: props.body.retention_rate_30d,
      moderation_actions_24h: props.body.moderation_actions_24h,
      reports_resolved_24h: props.body.reports_resolved_24h,
      system_uptime_percentage: props.body.system_uptime_percentage,
      avg_response_time: props.body.avg_response_time,
      error_rate: props.body.error_rate,
      snapshot_period: props.body.snapshot_period,
      snapshot_notes: props.body.snapshot_notes ?? null,
    } satisfies Prisma.community_platform_system_snapshotsCreateInput;
  }
}
