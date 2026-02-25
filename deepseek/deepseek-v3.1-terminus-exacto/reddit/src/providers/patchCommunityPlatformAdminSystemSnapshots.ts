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
import { CommunityPlatformSystemSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformSystemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminSystemSnapshots(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemSnapshot.IRequest;
}): Promise<IPageICommunityPlatformSystemSnapshot.ISummary> {
  // Extract and validate pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100); // Maximum 100 per page
  const skip = (page - 1) * limit;
  // Build WHERE clause based on filter criteria
  const whereInput: Prisma.community_platform_system_snapshotsWhereInput = {
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
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
  };
  // Build ORDER BY clause
  const orderByInput: Prisma.community_platform_system_snapshotsOrderByWithRelationInput =
    {
      ...(props.body.sort_by === "created_at" && {
        created_at: props.body.sort_order === "asc" ? "asc" : "desc",
      }),
      ...(props.body.sort_by === "total_users" && {
        total_users: props.body.sort_order === "asc" ? "asc" : "desc",
      }),
      ...(props.body.sort_by === "total_posts" && {
        total_posts: props.body.sort_order === "asc" ? "asc" : "desc",
      }),
      ...(props.body.sort_by === "total_comments" && {
        total_comments: props.body.sort_order === "asc" ? "asc" : "desc",
      }),
      ...(props.body.sort_by === "engagement_rate" && {
        engagement_rate: props.body.sort_order === "asc" ? "asc" : "desc",
      }),
      ...(!props.body.sort_by && {
        created_at: "desc", // Default sorting
      }),
    };
  // Execute queries sequentially (not parallel for database operations)
  const data =
    await MyGlobal.prisma.community_platform_system_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformSystemSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_system_snapshots.count(
    {
      where: whereInput,
    },
  );
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformSystemSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
