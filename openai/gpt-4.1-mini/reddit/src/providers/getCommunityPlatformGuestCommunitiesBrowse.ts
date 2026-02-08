import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestCommunitiesBrowse(props: {
  guest: GuestPayload;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const total = await MyGlobal.prisma.community_platform_communities.count();
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
      },
    });
  const data = await Promise.all(
    communities.map(async (community) => {
      const subscriber_count =
        await MyGlobal.prisma.community_platform_community_subscriptions.count({
          where: { community_id: community.id },
        });
      return {
        id: community.id,
        name: community.name,
        description: community.description,
        icon_url: community.icon_url,
        subscriber_count,
      };
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
