import { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformSystemSnapshotAtSummaryTransformer {
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
  ): Promise<ICommunityPlatformSystemSnapshot.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      total_users: input.total_users,
      active_users_24h: input.active_users_24h,
      total_posts: input.total_posts,
      posts_24h: input.posts_24h,
      total_comments: input.total_comments,
      comments_24h: input.comments_24h,
      total_votes: input.total_votes,
      votes_24h: input.votes_24h,
      engagement_rate: input.engagement_rate,
    };
  }
}
