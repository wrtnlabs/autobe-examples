import { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformSystemSnapshotTransformer {
  export type Payload = Prisma.community_platform_system_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        total_users: true,
        active_users_24h: true,
        active_users_7d: true,
        active_users_30d: true,
        total_communities: true,
        active_communities: true,
        total_posts: true,
        posts_24h: true,
        posts_7d: true,
        total_comments: true,
        comments_24h: true,
        comments_7d: true,
        total_votes: true,
        votes_24h: true,
        votes_7d: true,
        total_subscriptions: true,
        new_subscriptions_24h: true,
        avg_posts_per_user: true,
        avg_comments_per_user: true,
        avg_votes_per_user: true,
        user_growth_rate: true,
        content_growth_rate: true,
        engagement_rate: true,
        peak_concurrent_users: true,
        avg_session_duration: true,
        bounce_rate: true,
        retention_rate_7d: true,
        retention_rate_30d: true,
        moderation_actions_24h: true,
        reports_resolved_24h: true,
        system_uptime_percentage: true,
        avg_response_time: true,
        error_rate: true,
        snapshot_period: true,
        snapshot_notes: true,
      },
    } satisfies Prisma.community_platform_system_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSystemSnapshot> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      total_users: input.total_users,
      active_users_24h: input.active_users_24h,
      active_users_7d: input.active_users_7d,
      active_users_30d: input.active_users_30d,
      total_communities: input.total_communities,
      active_communities: input.active_communities,
      total_posts: input.total_posts,
      posts_24h: input.posts_24h,
      posts_7d: input.posts_7d,
      total_comments: input.total_comments,
      comments_24h: input.comments_24h,
      comments_7d: input.comments_7d,
      total_votes: input.total_votes,
      votes_24h: input.votes_24h,
      votes_7d: input.votes_7d,
      total_subscriptions: input.total_subscriptions,
      new_subscriptions_24h: input.new_subscriptions_24h,
      avg_posts_per_user: input.avg_posts_per_user,
      avg_comments_per_user: input.avg_comments_per_user,
      avg_votes_per_user: input.avg_votes_per_user,
      user_growth_rate: input.user_growth_rate,
      content_growth_rate: input.content_growth_rate,
      engagement_rate: input.engagement_rate,
      peak_concurrent_users: input.peak_concurrent_users,
      avg_session_duration: input.avg_session_duration,
      bounce_rate: input.bounce_rate,
      retention_rate_7d: input.retention_rate_7d,
      retention_rate_30d: input.retention_rate_30d,
      moderation_actions_24h: input.moderation_actions_24h,
      reports_resolved_24h: input.reports_resolved_24h,
      system_uptime_percentage: input.system_uptime_percentage,
      avg_response_time: input.avg_response_time,
      error_rate: input.error_rate,
      snapshot_period: input.snapshot_period,
      snapshot_notes: input.snapshot_notes ?? null,
    };
  }
}
