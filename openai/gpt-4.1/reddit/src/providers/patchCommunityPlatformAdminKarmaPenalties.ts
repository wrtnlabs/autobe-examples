import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import { IPageICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaPenalty";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminKarmaPenalties(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaPenalty.IRequest;
}): Promise<IPageICommunityPlatformKarmaPenalty.ISummary> {
  const { body } = props;

  // Pagination default: page=0, limit=20
  const page = typeof body.page === "number" ? body.page : 0;
  const limit = typeof body.limit === "number" ? body.limit : 20;
  const offset = page * limit;

  // Build where filter
  const where = {
    deleted_at: null,
    ...(body.member_id !== undefined && {
      community_platform_member_id: body.member_id,
    }),
    ...(body.community_id !== undefined &&
      body.community_id !== null && {
        community_platform_community_id: body.community_id,
      }),
    ...(body.penalty_type !== undefined && { penalty_type: body.penalty_type }),
    ...(body.penalty_status !== undefined && {
      penalty_status: body.penalty_status,
    }),
    ...((body.applied_from !== undefined || body.applied_to !== undefined) && {
      applied_at: {
        ...(body.applied_from !== undefined && { gte: body.applied_from }),
        ...(body.applied_to !== undefined && { lte: body.applied_to }),
      },
    }),
  };

  // Acceptable sort fields for ISummary
  const allowedSortFields = [
    "applied_at",
    "created_at",
    "penalty_value",
    "expires_at",
  ];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "applied_at";
  const sortDirection =
    body.sort_direction === "asc" || body.sort_direction === "desc"
      ? body.sort_direction
      : "desc";

  // Find rows and total, parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_karma_penalties.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: offset,
      take: limit,
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
        penalty_type: true,
        penalty_value: true,
        penalty_reason: true,
        penalty_status: true,
        applied_at: true,
        expires_at: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_karma_penalties.count({ where }),
  ]);

  // Map to ISummary shape
  const data = rows.map((row) => ({
    id: row.id,
    community_platform_member_id: row.community_platform_member_id,
    community_platform_community_id:
      row.community_platform_community_id ?? undefined,
    penalty_type: row.penalty_type,
    penalty_value: row.penalty_value,
    penalty_reason: row.penalty_reason,
    penalty_status: row.penalty_status,
    applied_at: toISOStringSafe(row.applied_at),
    expires_at: row.expires_at ? toISOStringSafe(row.expires_at) : undefined,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
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
