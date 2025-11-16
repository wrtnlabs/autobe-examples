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

export async function putRedditCommunityModeratorCommunitiesCommunityName(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityCommunity.IUpdate;
}): Promise<IRedditCommunityCommunity> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (community.deleted_at !== null) {
    throw new HttpException("Community has been deleted", 404);
  }

  const moderatorRelation =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: community.id,
      },
    });

  if (!moderatorRelation) {
    throw new HttpException(
      "You do not have moderation authority for this community",
      403,
    );
  }

  const updated = await MyGlobal.prisma.reddit_community_communities.update({
    where: { id: community.id },
    data: {
      ...(props.body.display_title !== undefined && {
        display_title: props.body.display_title,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_url !== undefined && {
        icon_url: props.body.icon_url,
      }),
      ...(props.body.banner_url !== undefined && {
        banner_url: props.body.banner_url,
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    creator_member_id: updated.creator_member_id,
    name: updated.name,
    display_title: updated.display_title,
    description: updated.description,
    rules: "",
    icon_url: updated.icon_url ?? undefined,
    banner_url: updated.banner_url ?? undefined,
    subscriber_count: updated.subscriber_count,
    post_count: updated.post_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
