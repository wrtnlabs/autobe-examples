import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import { IPageICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBanner";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdBanners(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanner.IRequest;
}): Promise<IPageICommunityPlatformCommunityBanner> {
  const { admin, communityId, body } = props;

  // Default pagination
  const defaultLimit = 20;
  const maxLimit = 100;
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit =
    body.limit && body.limit > 0
      ? body.limit > maxLimit
        ? maxLimit
        : body.limit
      : defaultLimit;
  const skip = (page - 1) * limit;

  // Build filters
  const where: Record<string, any> = {
    community_id: communityId,
    ...(body.active !== undefined && { active: body.active }),
    ...(body.order !== undefined && { order: body.order }),
    ...(body.file_upload_id !== undefined && {
      file_upload_id: body.file_upload_id,
    }),
    ...(body.alt_text !== undefined && {
      alt_text: { contains: body.alt_text },
    }),
    // Date range filters
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
    ...(body.updated_at_from !== undefined || body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined && {
              gte: body.updated_at_from,
            }),
            ...(body.updated_at_to !== undefined && {
              lte: body.updated_at_to,
            }),
          },
        }
      : {}),
    // Soft delete logic
    ...(body.include_deleted ? {} : { deleted_at: null }),
  };

  // Query data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_banners.findMany({
      where,
      orderBy: [{ order: "asc" }, { created_at: "desc" }],
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_community_banners.count({ where }),
  ]);

  // Map to DTO
  const data = rows.map((row) => {
    return {
      id: row.id,
      community_id: row.community_id,
      file_upload_id: row.file_upload_id,
      order:
        row.order === null || row.order === undefined ? undefined : row.order,
      alt_text:
        row.alt_text === null || row.alt_text === undefined
          ? undefined
          : row.alt_text,
      active: row.active,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : undefined,
    };
  });

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
