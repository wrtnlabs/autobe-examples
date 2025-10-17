import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaThreshold } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaThreshold";
import { IPageICommunityPlatformKarmaThreshold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaThreshold";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminKarmaThresholds(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaThreshold.IRequest;
}): Promise<IPageICommunityPlatformKarmaThreshold> {
  // Authorization: only admins permitted (decorator layer should enforce)
  const { body } = props;

  // Filters
  const where = {
    ...(body.community_platform_community_id !== undefined && {
      community_platform_community_id:
        body.community_platform_community_id ?? null,
    }),
    ...(body.threshold_type !== undefined &&
      body.threshold_type !== null && {
        threshold_type: body.threshold_type,
      }),
  };

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Sorting (default: created_at desc)
  const allowedSortFields = ["created_at", "threshold_value"];
  let sortField: string = "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const trimmed = body.sort.trim();
    if (trimmed.startsWith("-")) {
      sortField = trimmed.slice(1);
      sortOrder = "desc";
    } else if (trimmed.startsWith("+")) {
      sortField = trimmed.slice(1);
      sortOrder = "asc";
    } else if (trimmed.length > 0) {
      sortField = trimmed;
    }
    if (!allowedSortFields.includes(sortField)) {
      sortField = "created_at";
    }
  }

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_karma_thresholds.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_karma_thresholds.count({ where }),
  ]);

  // Build result
  const data = rows.map((row) => ({
    id: row.id,
    community_platform_community_id:
      row.community_platform_community_id === null
        ? null
        : row.community_platform_community_id,
    threshold_type: row.threshold_type,
    threshold_value: row.threshold_value,
    feature_lock_reason: row.feature_lock_reason ?? null,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
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
