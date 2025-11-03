import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityArchive";
import { IPageICommunityPlatformCommunityArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityArchive";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdArchives(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityArchive.IRequest;
}): Promise<IPageICommunityPlatformCommunityArchive.ISummary> {
  // Authorization: ensure admin exists and is not soft-deleted
  const adminExists = await MyGlobal.prisma.community_platform_admins.findFirst(
    {
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
    },
  );
  if (adminExists === null) {
    throw new HttpException(
      "Forbidden: Only platform admins can view community archives.",
      403,
    );
  }

  const { page, limit, search, order_by, order_direction } = props.body;
  const skip = (page - 1) * limit;

  // Where clause: always filter by communityId, optionally by search (OR on name/desc)
  const where = {
    community_platform_community_id: props.communityId,
    ...(search !== undefined &&
      search !== null &&
      search.length > 0 && {
        OR: [
          { archived_name: { contains: search } },
          { archived_description: { contains: search } },
        ],
      }),
  };

  // Order by field (always inline)
  const orderBy = { [order_by]: order_direction };

  // Query page and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_archives.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        community_platform_community_id: true,
        archived_by_user_id: true,
        archived_name: true,
        archived_description: true,
        archived_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_community_archives.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      community_platform_community_id: row.community_platform_community_id,
      archived_by_user_id: row.archived_by_user_id,
      archived_name: row.archived_name,
      archived_description: row.archived_description,
      archived_at: toISOStringSafe(row.archived_at),
    })),
  };
}
