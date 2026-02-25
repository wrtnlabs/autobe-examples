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

export async function patchCommunityPlatformAdminAnalyticsPerformance(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemSnapshot.IRequest;
}): Promise<IPageICommunityPlatformSystemSnapshot.ISummary> {
  // Validate date range if both provided
  if (props.body.created_at_start && props.body.created_at_end) {
    if (props.body.created_at_start > props.body.created_at_end) {
      throw new HttpException(
        "Invalid date range: created_at_start must not be after created_at_end",
        400,
      );
    }
  }
  // Default pagination values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE condition without Date type
  const whereInput = {
    deleted_at: null,
    ...(props.body.created_at_start && {
      created_at: {
        gte: props.body.created_at_start,
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: props.body.created_at_end,
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
  // Determine order by with proper type assertion
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput = (
    props.body.sort_by === "total_users"
      ? { total_users: sortOrder }
      : props.body.sort_by === "total_posts"
        ? { total_posts: sortOrder }
        : props.body.sort_by === "total_comments"
          ? { total_comments: sortOrder }
          : props.body.sort_by === "engagement_rate"
            ? { engagement_rate: sortOrder }
            : { created_at: sortOrder }
  ) satisfies Prisma.community_platform_system_snapshotsOrderByWithRelationInput;
  // Execute queries sequentially
  const data =
    await MyGlobal.prisma.community_platform_system_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
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
    });
  const total = await MyGlobal.prisma.community_platform_system_snapshots.count(
    {
      where: whereInput,
    },
  );
  // Transform to DTO without using Date type
  const transformedData = data.map(
    (record) =>
      ({
        id: record.id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(record.created_at),
        total_users: record.total_users,
        active_users_24h: record.active_users_24h,
        total_posts: record.total_posts,
        posts_24h: record.posts_24h,
        total_comments: record.total_comments,
        comments_24h: record.comments_24h,
        total_votes: record.total_votes,
        votes_24h: record.votes_24h,
        engagement_rate: record.engagement_rate,
      }) satisfies ICommunityPlatformSystemSnapshot.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformSystemSnapshot.ISummary;
}
