import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileHistory";
import { IPageICommunityPlatformProfileHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminProfilesProfileIdHistory(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileHistory.IRequest;
}): Promise<IPageICommunityPlatformProfileHistory> {
  const { profileId, body } = props;
  // 1. Check profile exists
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: {
      id: profileId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!profile) throw new HttpException("Profile not found", 404);

  // 2. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build filters
  const where: Record<string, any> = {
    community_platform_profile_id: profileId,
    deleted_at: null,
    ...(body.changed_by_actor !== undefined &&
      body.changed_by_actor !== null && {
        changed_by_actor: body.changed_by_actor,
      }),
    ...((body.date_range_start !== undefined &&
      body.date_range_start !== null) ||
    (body.date_range_end !== undefined && body.date_range_end !== null)
      ? {
          changed_at: {
            ...(body.date_range_start !== undefined &&
              body.date_range_start !== null && { gte: body.date_range_start }),
            ...(body.date_range_end !== undefined &&
              body.date_range_end !== null && { lte: body.date_range_end }),
          },
        }
      : {}),
    // field_changed is an extra filter, but not a real Prisma field, must skip here
  };

  // 4. Build order
  const sortField = body.sort ?? "changed_at";
  const orderDir = body.order === "asc" ? "asc" : "desc";
  const orderBy = [{ [sortField]: orderDir }];

  // 5. Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_profile_histories.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_profile_histories.count({
      where,
    }),
  ]);

  // 6. Data transform
  const data: ICommunityPlatformProfileHistory[] = rows.map((row) => ({
    id: row.id,
    community_platform_profile_id: row.community_platform_profile_id,
    username: row.username,
    bio: row.bio ?? undefined,
    avatar_uri: row.avatar_uri ?? undefined,
    display_email: row.display_email ?? undefined,
    status_message: row.status_message ?? undefined,
    is_public: row.is_public,
    changed_by_actor: row.changed_by_actor,
    change_reason: row.change_reason ?? undefined,
    changed_at: toISOStringSafe(row.changed_at),
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
