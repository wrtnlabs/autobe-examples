import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

export async function getCommunityPlatformCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunity> {
  // Remove typia.isFormat check because it does not exist
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  return {
    id: community.id,
    owner_user_id: community.owner_user_id,
    name: community.name,
    description:
      community.description === null ? undefined : community.description,
    icon_url: community.icon_url === null ? undefined : community.icon_url,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : null,
  };
}
