import { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAnalyticsHealth(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemSnapshot.IRequest;
}): Promise<IPageICommunityPlatformSystemSnapshot.ISummary> {
  // Extract pagination parameters with safety checks
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE conditions using proper date handling
  const whereInput: Prisma.community_platform_system_snapshotsWhereInput = {
    deleted_at: null,
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
    ...(props.body.snapshot_period && {
      snapshot_period: props.body.snapshot_period,
    }),
    ...(props.body.total_users_min !== undefined && {
      total_users: { gte: props.body.total_users_min },
    }),
    ...(props.body.total_users_max !== undefined && {
      total_users: { lte: props.body.total_users_max },
    }),
    ...(props.body.active_users_24h_min !== undefined && {
      active_users_24h: { gte: props.body.active_users_24h_min },
    }),
    ...(props.body.active_users_24h_max !== undefined && {
      active_users_24h: { lte: props.body.active_users_24h_max },
    }),
    ...(props.body.total_posts_min !== undefined && {
      total_posts: { gte: props.body.total_posts_min },
    }),
    ...(props.body.total_posts_max !== undefined && {
      total_posts: { lte: props.body.total_posts_max },
    }),
    ...(props.body.total_comments_min !== undefined && {
      total_comments: { gte: props.body.total_comments_min },
    }),
    ...(props.body.total_comments_max !== undefined && {
      total_comments: { lte: props.body.total_comments_max },
    }),
    ...(props.body.engagement_rate_min !== undefined && {
      engagement_rate: { gte: props.body.engagement_rate_min },
    }),
    ...(props.body.engagement_rate_max !== undefined && {
      engagement_rate: { lte: props.body.engagement_rate_max },
    }),
    ...(props.body.avg_response_time_min !== undefined && {
      avg_response_time: { gte: props.body.avg_response_time_min },
    }),
    ...(props.body.avg_response_time_max !== undefined && {
      avg_response_time: { lte: props.body.avg_response_time_max },
    }),
    ...(props.body.error_rate_min !== undefined && {
      error_rate: { gte: props.body.error_rate_min },
    }),
    ...(props.body.error_rate_max !== undefined && {
      error_rate: { lte: props.body.error_rate_max },
    }),
  } satisfies Prisma.community_platform_system_snapshotsWhereInput;
  // Determine sorting order
  const orderByInput = (
    props.body.sort_by === "total_users"
      ? { total_users: props.body.sort_order ?? "desc" }
      : props.body.sort_by === "total_posts"
        ? { total_posts: props.body.sort_order ?? "desc" }
        : props.body.sort_by === "total_comments"
          ? { total_comments: props.body.sort_order ?? "desc" }
          : props.body.sort_by === "engagement_rate"
            ? { engagement_rate: props.body.sort_order ?? "desc" }
            : { created_at: props.body.sort_order ?? "desc" }
  ) satisfies Prisma.community_platform_system_snapshotsOrderByWithRelationInput;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_system_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        created_at: true,
        total_users: true,
        active_users_24h: true,
        total_posts: true,
        posts_24h: true,
        total_comments: true,
        comments_24h: true,
        total_votes: true,
        votes_24h: true,
        engagement_rate: true,
      } satisfies Prisma.community_platform_system_snapshotsFindManyArgs["select"],
    }),
    MyGlobal.prisma.community_platform_system_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform database records to DTO format
  const transformedData = data.map(
    (snapshot) =>
      ({
        id: snapshot.id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(snapshot.created_at) as string &
          tags.Format<"date-time">,
        total_users: snapshot.total_users,
        active_users_24h: snapshot.active_users_24h,
        total_posts: snapshot.total_posts,
        posts_24h: snapshot.posts_24h,
        total_comments: snapshot.total_comments,
        comments_24h: snapshot.comments_24h,
        total_votes: snapshot.total_votes,
        votes_24h: snapshot.votes_24h,
        engagement_rate: snapshot.engagement_rate,
      }) satisfies ICommunityPlatformSystemSnapshot.ISummary,
  );
  // Calculate pagination
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformSystemSnapshot.ISummary;
}
