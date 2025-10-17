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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdBanners(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanner.IRequest;
}): Promise<IPageICommunityPlatformCommunityBanner> {
  const { moderator, communityId, body } = props;

  // 1. Authorization: Moderator must be assigned and active for this community
  // Only active, non-soft-deleted assignment
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: moderator.id, // 'moderator.id' is member UUID
        community_id: communityId,
        status: "active",
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: Not a moderator of this community",
      403,
    );
  }

  // 2. If body.community_id is present and does not match path, reject
  if (body.community_id !== undefined && body.community_id !== communityId) {
    throw new HttpException(
      "community_id in filter must match path parameter",
      400,
    );
  }

  // 3. Pagination logic
  const page = body.page && body.page > 0 ? Number(body.page) : 1;
  const limit =
    body.limit && body.limit > 0 ? Math.min(Number(body.limit), 50) : 20;
  const skip = (page - 1) * limit;

  // 4. Filter construction
  const where = {
    community_id: communityId,
    // Active status filter
    ...(body.active !== undefined && { active: body.active }),
    // File upload id filter
    ...(body.file_upload_id !== undefined && {
      file_upload_id: body.file_upload_id,
    }),
    // order filter
    ...(body.order !== undefined && { order: body.order }),
    // Alt text filter (contains)
    ...(body.alt_text !== undefined && {
      alt_text: { contains: body.alt_text },
    }),
    // Created at range
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
    // Updated at range
    ...((body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
              body.updated_at_from !== null && { gte: body.updated_at_from }),
            ...(body.updated_at_to !== undefined &&
              body.updated_at_to !== null && { lte: body.updated_at_to }),
          },
        }
      : {}),
    // Deleted at (soft delete)
    ...(body.include_deleted !== true ? { deleted_at: null } : {}),
  };

  // 5. Query rows and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_banners.findMany({
      where,
      orderBy: [{ order: "asc" }, { created_at: "desc" }, { id: "asc" }],
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_community_banners.count({ where }),
  ]);

  // 6. Map results to DTOs
  const data = rows.map((row) => ({
    id: row.id,
    community_id: row.community_id,
    file_upload_id: row.file_upload_id,
    order: row.order ?? undefined,
    alt_text: row.alt_text ?? undefined,
    active: row.active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at != null ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // 7. Pagination info
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
