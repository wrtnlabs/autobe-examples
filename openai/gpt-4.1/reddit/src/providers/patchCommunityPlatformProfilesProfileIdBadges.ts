import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import { IPageICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileBadge";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformProfilesProfileIdBadges(props: {
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileBadge.IRequest;
}): Promise<IPageICommunityPlatformProfileBadge.ISummary> {
  const { profileId, body } = props;
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    community_platform_profile_id: profileId,
    ...(body.badge_type !== undefined && { badge_type: body.badge_type }),
    ...(body.badge_name !== undefined && { badge_name: body.badge_name }),
    ...(body.revoked !== undefined &&
      (body.revoked ? { revoked_at: { not: null } } : { revoked_at: null })),
    ...(body.issued_at_from !== undefined && {
      issued_at: { gte: body.issued_at_from },
    }),
    // issued_at_to augments issued_at range
    ...(body.issued_at_to !== undefined && body.issued_at_from !== undefined
      ? { issued_at: { gte: body.issued_at_from, lte: body.issued_at_to } }
      : body.issued_at_to !== undefined
        ? { issued_at: { lte: body.issued_at_to } }
        : {}),
  };

  const allowedSortFields = ["issued_at", "badge_type"];
  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "issued_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_profile_badges.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.community_platform_profile_badges.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    community_platform_profile_id: row.community_platform_profile_id,
    badge_type: row.badge_type,
    badge_name: row.badge_name,
    issued_at: toISOStringSafe(row.issued_at),
    issuer: row.issuer ?? undefined,
    revoked_at: row.revoked_at ? toISOStringSafe(row.revoked_at) : null,
    revoke_reason: row.revoke_reason ?? null,
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
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
