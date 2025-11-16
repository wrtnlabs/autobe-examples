import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function getCommunityPlatformCommunitiesCommunityName(props: {
  communityName: string;
}): Promise<ICommunityPlatformCommunity> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: {
          equals: props.communityName,
          mode: "insensitive",
        },
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  return {
    id: community.id,
    name: community.name,
    display_title: community.display_title,
    description: community.description,
    visibility: community.visibility,
    image_url: community.image_url ?? undefined,
    status: community.status,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : undefined,
  };
}
