import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserCommunitiesCommunityId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunity> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });

  return {
    id: community.id,
    creator_user_id: community.creator_user_id,
    name: community.name,
    description: community.description,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at:
      community.deleted_at !== null
        ? toISOStringSafe(community.deleted_at)
        : null,
  };
}
