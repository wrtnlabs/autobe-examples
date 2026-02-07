import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityCommunitiesCommunityId(props: {
  communityId: string;
}): Promise<ICommunityCommunity> {
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: props.communityId },
    select: {
      id: true,
      owner_id: true,
      name: true,
      description: true,
      icon_url: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  return {
    id: community.id,
    owner_id: community.owner_id,
    name: community.name,
    description: community.description,
    icon_url: community.icon_url,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
  };
}
