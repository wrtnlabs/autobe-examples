import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaStats";
import { IPageICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaStats";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminKarmaStats(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaStats.IRequest;
}): Promise<IPageICommunityPlatformKarmaStats> {
  const { page, limit, min_total_karma, max_total_karma, sort_by, sort_order } =
    props.body;
  const where = {
    ...(min_total_karma !== undefined &&
      min_total_karma !== null && { total_karma: { gte: min_total_karma } }),
    ...(max_total_karma !== undefined &&
      max_total_karma !== null &&
      (min_total_karma !== undefined && min_total_karma !== null
        ? { total_karma: { gte: min_total_karma, lte: max_total_karma } }
        : { total_karma: { lte: max_total_karma } })),
  };
  const allowedSortFields = [
    "total_karma",
    "post_karma",
    "comment_karma",
    "lifetime_karma",
    "maximum_karma",
    "created_at",
    "updated_at",
  ];
  const offset = (page - 1) * limit;
  const take = limit;
  // orderBy must be defined inline for Prisma inference
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_karma_stats.findMany({
      where,
      orderBy:
        sort_by && allowedSortFields.includes(sort_by)
          ? {
              [sort_by]:
                sort_order === "asc" ? ("asc" as const) : ("desc" as const),
            }
          : { created_at: "desc" as const },
      skip: offset,
      take,
    }),
    MyGlobal.prisma.community_platform_karma_stats.count({ where }),
  ]);
  const data = records.map((row) => ({
    id: row.id,
    community_platform_user_id: row.community_platform_user_id,
    total_karma: row.total_karma,
    post_karma: row.post_karma,
    comment_karma: row.comment_karma,
    lifetime_karma: row.lifetime_karma,
    maximum_karma: row.maximum_karma,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
