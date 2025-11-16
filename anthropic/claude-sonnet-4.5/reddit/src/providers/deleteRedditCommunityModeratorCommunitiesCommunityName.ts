import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorCommunitiesCommunityName(props: {
  moderator: ModeratorPayload;
  communityName: string;
}): Promise<IRedditCommunityCommunity> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const moderatorRelation =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.moderator.id,
      },
    });

  if (!moderatorRelation) {
    throw new HttpException("Forbidden", 403);
  }

  const deletedCommunity =
    await MyGlobal.prisma.reddit_community_communities.update({
      where: { id: community.id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });

  return {
    id: deletedCommunity.id,
    creator_member_id: deletedCommunity.creator_member_id,
    name: deletedCommunity.name,
    display_title: deletedCommunity.display_title,
    description: deletedCommunity.description,
    rules: "",
    icon_url: deletedCommunity.icon_url ?? null,
    banner_url: deletedCommunity.banner_url ?? null,
    subscriber_count: deletedCommunity.subscriber_count,
    post_count: deletedCommunity.post_count,
    created_at: toISOStringSafe(deletedCommunity.created_at),
    updated_at: toISOStringSafe(deletedCommunity.updated_at),
    deleted_at: deletedCommunity.deleted_at
      ? toISOStringSafe(deletedCommunity.deleted_at)
      : null,
  };
}
