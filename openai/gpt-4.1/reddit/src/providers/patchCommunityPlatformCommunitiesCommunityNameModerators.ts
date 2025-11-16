import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function patchCommunityPlatformCommunitiesCommunityNameModerators(props: {
  communityName: string;
  body: ICommunityPlatformCommunityModerator.IRequest;
}): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
  // 1. Validate and find community by slug
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityName },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // 2. Build moderation filters
  const where: Record<string, unknown> = {
    community_platform_community_id: community.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.assigned_from || props.body.assigned_to
      ? {
          assigned_at: {
            ...(props.body.assigned_from && { gte: props.body.assigned_from }),
            ...(props.body.assigned_to && { lte: props.body.assigned_to }),
          },
        }
      : {}),
  };

  // 3. Search
  // For demo: moderator search by id (if implemented, would join profile table for advanced search)
  // Here we ignore complex joins. Real search would require more info and joins.

  // 4. Pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // 5. Order
  let orderBy = undefined;
  if (props.body.order_by) {
    orderBy = [{ [props.body.order_by]: props.body.order_direction || "asc" }];
  }

  // 6. Query moderators
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_moderators.findMany({
      where,
      include: {
        moderator: true,
        community: true,
      },
      skip,
      take: limit,
      ...(orderBy && { orderBy }),
    }),
    MyGlobal.prisma.community_platform_community_moderators.count({ where }),
  ]);

  // 7. Map output
  const data = rows.map((row) => ({
    id: row.id,
    community: {
      id: row.community.id,
      name: row.community.name,
      display_title: row.community.display_title,
      description: row.community.description,
      visibility: row.community.visibility,
      image_url: row.community.image_url ?? undefined,
      status: row.community.status,
    },
    moderator: {
      id: row.moderator.id,
    },
    assigned_at: toISOStringSafe(row.assigned_at),
    status: row.status,
  }));

  // 8. Return paginated summary
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
