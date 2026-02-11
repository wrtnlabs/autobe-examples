import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunityViews(props: {
  body: IRedditPlatformCommunityFeedView.IRequest;
}): Promise<IRedditPlatformCommunityFeedView.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.reddit_platform_community_feed_viewsWhereInput = {
    deleted_at: null,
  };
  if (props.body.community_id) {
    where.community_id = props.body.community_id;
  }
  if (props.body.created_at_from || props.body.created_at_to) {
    where.created_at = {};
    if (props.body.created_at_from) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to) {
      where.created_at.lte = props.body.created_at_to;
    }
  }
  if (props.body.is_authenticated !== undefined) {
    where.is_authenticated = props.body.is_authenticated;
  }
  if (props.body.min_view_duration !== undefined) {
    where.view_duration_seconds =
      {} as Prisma.IntNullableFilter<"reddit_platform_community_feed_views">;
    where.view_duration_seconds.gte = props.body.min_view_duration;
  }
  if (props.body.min_posts_viewed !== undefined) {
    where.posts_viewed_count =
      {} as Prisma.IntNullableFilter<"reddit_platform_community_feed_views">;
    where.posts_viewed_count.gte = props.body.min_posts_viewed;
  }
  if (props.body.min_scroll_depth !== undefined) {
    where.scroll_depth_percent =
      {} as Prisma.IntNullableFilter<"reddit_platform_community_feed_views">;
    where.scroll_depth_percent.gte = props.body.min_scroll_depth;
  }
  // Get aggregated metrics from database
  const [result] = await MyGlobal.prisma.$queryRaw<
    {
      community_id: string;
      name: string;
      total_views: bigint;
      avg_view_duration_seconds: number;
      avg_posts_viewed: number;
      avg_scroll_depth_percent: number;
      unique_visitors: bigint;
      guest_views: bigint;
      authenticated_views: bigint;
    }[]
  >`
    SELECT 
      c.id AS community_id,
      c.name AS name,
      COUNT(*) AS total_views,
      COALESCE(AVG(v.view_duration_seconds), 0) AS avg_view_duration_seconds,
      COALESCE(AVG(v.posts_viewed_count), 0) AS avg_posts_viewed,
      COALESCE(AVG(v.scroll_depth_percent), 0) AS avg_scroll_depth_percent,
      COUNT(DISTINCT v.ip_address) AS unique_visitors,
      COUNT(*) FILTER (WHERE v.is_authenticated = false) AS guest_views,
      COUNT(*) FILTER (WHERE v.is_authenticated = true) AS authenticated_views
    FROM reddit_platform_community_feed_views v
    JOIN reddit_platform_communities c ON c.id = v.community_id
    WHERE v.deleted_at IS NULL
      ${props.body.community_id ? Prisma.sql`AND v.community_id = ${props.body.community_id}` : Prisma.sql``}
      ${props.body.created_at_from ? Prisma.sql`AND v.created_at >= ${props.body.created_at_from}` : Prisma.sql``}
      ${props.body.created_at_to ? Prisma.sql`AND v.created_at <= ${props.body.created_at_to}` : Prisma.sql``}
      ${props.body.is_authenticated !== undefined ? Prisma.sql`AND v.is_authenticated = ${props.body.is_authenticated}` : Prisma.sql``}
      ${props.body.min_view_duration !== undefined ? Prisma.sql`AND v.view_duration_seconds >= ${props.body.min_view_duration}` : Prisma.sql``}
      ${props.body.min_posts_viewed !== undefined ? Prisma.sql`AND v.posts_viewed_count >= ${props.body.min_posts_viewed}` : Prisma.sql``}
      ${props.body.min_scroll_depth !== undefined ? Prisma.sql`AND v.scroll_depth_percent >= ${props.body.min_scroll_depth}` : Prisma.sql``}
    GROUP BY c.id, c.name
    ORDER BY v.created_at DESC
    LIMIT 1
  `;
  if (!result) {
    // Return empty stats if no data found
    return {
      community_id: v4() as string & tags.Format<"uuid">,
      name: "",
      total_views: 0,
      avg_view_duration_seconds: 0,
      avg_posts_viewed: 0,
      avg_scroll_depth_percent: 0,
      unique_visitors: 0,
      guest_views: 0,
      authenticated_views: 0,
      created_at: toISOStringSafe(new Date()),
    };
  }
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.reddit_platform_community_feed_views.count({ where });
  return {
    community_id: result.community_id,
    name: result.name,
    total_views: Number(result.total_views),
    avg_view_duration_seconds: Number(result.avg_view_duration_seconds),
    avg_posts_viewed: Number(result.avg_posts_viewed),
    avg_scroll_depth_percent: Number(result.avg_scroll_depth_percent),
    unique_visitors: Number(result.unique_visitors),
    guest_views: Number(result.guest_views),
    authenticated_views: Number(result.authenticated_views),
    created_at: toISOStringSafe(new Date()),
  };
}
