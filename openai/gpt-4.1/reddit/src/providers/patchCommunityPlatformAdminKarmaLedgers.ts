import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";
import { IPageICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaLedger";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminKarmaLedgers(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaLedger.IRequest;
}): Promise<IPageICommunityPlatformKarmaLedger.ISummary> {
  const body = props.body;
  const page =
    body.page !== undefined && body.page !== null ? Number(body.page) : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  const allowedSortFields = ["created_at", "updated_at", "current_karma"];
  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortDir: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // Compose karma bounds if both min/max are present
  let karmaBounds: { gte?: number; lte?: number } | undefined = undefined;
  if (body.min_karma !== undefined && body.max_karma !== undefined) {
    karmaBounds = { gte: body.min_karma, lte: body.max_karma };
  } else if (body.min_karma !== undefined) {
    karmaBounds = { gte: body.min_karma };
  } else if (body.max_karma !== undefined) {
    karmaBounds = { lte: body.max_karma };
  }

  const where = {
    ...(body.status === "deleted"
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
    ...(body.community_platform_member_id !== undefined &&
      body.community_platform_member_id !== null && {
        community_platform_member_id: body.community_platform_member_id,
      }),
    ...(body.community_platform_community_id !== undefined &&
      body.community_platform_community_id !== null && {
        community_platform_community_id: body.community_platform_community_id,
      }),
    ...(karmaBounds !== undefined && { current_karma: karmaBounds }),
    ...(body.feature_lock_reason !== undefined &&
      body.feature_lock_reason !== null && {
        feature_lock_reason: { contains: body.feature_lock_reason },
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_karma_ledgers.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_karma_ledgers.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    community_platform_member_id: row.community_platform_member_id,
    community_platform_community_id:
      row.community_platform_community_id === undefined
        ? undefined
        : row.community_platform_community_id === null
          ? null
          : row.community_platform_community_id,
    current_karma: row.current_karma,
    feature_lock_reason:
      row.feature_lock_reason === undefined
        ? undefined
        : row.feature_lock_reason === null
          ? null
          : row.feature_lock_reason,
    updated_at: toISOStringSafe(row.updated_at),
    created_at: toISOStringSafe(row.created_at),
    deleted_at:
      row.deleted_at === undefined
        ? undefined
        : row.deleted_at === null
          ? null
          : toISOStringSafe(row.deleted_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
