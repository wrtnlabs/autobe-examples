import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

export async function getRedditCommunityCommunitiesCommunityName(props: {
  communityName: string;
}): Promise<IRedditCommunityCommunity> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: {
        name: props.communityName,
      },
    });

  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }

  return {
    id: community.id,
    creator_member_id: community.creator_member_id,
    name: community.name,
    display_title: community.display_title,
    description: community.description,
    rules: "",
    icon_url: community.icon_url ?? undefined,
    banner_url: community.banner_url ?? undefined,
    subscriber_count: community.subscriber_count,
    post_count: community.post_count,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at:
      community.deleted_at !== null
        ? toISOStringSafe(community.deleted_at)
        : undefined,
  };
}
