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
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function patchCommunityPlatformCommunitiesCommunityIdModerators(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IRequest;
}): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
  // Check if the community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) throw new HttpException("Community not found", 404);

  const { page, limit, search, sort_by, order } = props.body;
  const skip = (page - 1) * limit;

  // Prepare user search filtering
  let userWhere: Record<string, any> = {};
  if (search && search.trim().length > 0) {
    userWhere = {
      OR: [
        { display_name: { contains: search } },
        { email: { contains: search } },
      ],
    };
  }

  // Determine sorting
  let orderBy: Record<string, any> = {};
  if (sort_by === "display_name") {
    orderBy = {
      user: { display_name: order === "desc" ? "desc" : "asc" },
    };
  } else {
    // default and "assigned_at"
    orderBy = {
      assigned_at: order === "desc" ? "desc" : "asc",
    };
  }

  // Find moderators with user and community joined
  const where = { community_platform_community_id: props.communityId };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.community_platform_community_moderators.count({
      where: {
        ...where,
        ...(userWhere.OR && { user: userWhere }),
      },
    }),
    MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: {
        ...where,
        ...(userWhere.OR && { user: userWhere }),
      },
      include: {
        user: true,
        community: true,
      },
      orderBy: orderBy,
      skip: skip,
      take: limit,
    }),
  ]);

  // Map results
  const data = rows.map((mod) => ({
    id: mod.id,
    assigned_at: toISOStringSafe(mod.assigned_at),
    user: {
      id: mod.user.id,
      display_name: mod.user.display_name,
    },
    community: {
      id: mod.community.id,
      name: mod.community.name,
      description: mod.community.description,
    },
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: data,
  };
}
