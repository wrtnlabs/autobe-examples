import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorCommunitiesCommunityNameModeratorsUsername(props: {
  moderator: ModeratorPayload;
  communityName: string;
  username: string;
}): Promise<IRedditCommunityCommunityModerator> {
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

  const moderatorToRemove =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });

  if (!moderatorToRemove) {
    throw new HttpException("Moderator not found", 404);
  }

  const authenticatedModeratorRelation =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: community.id,
      },
    });

  if (
    !authenticatedModeratorRelation ||
    !authenticatedModeratorRelation.is_creator
  ) {
    throw new HttpException(
      "Only community creators can remove moderators",
      403,
    );
  }

  const moderatorRelation =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: moderatorToRemove.id,
        community_id: community.id,
      },
    });

  if (!moderatorRelation) {
    throw new HttpException("Moderator relationship not found", 404);
  }

  await MyGlobal.prisma.reddit_community_community_moderators.delete({
    where: {
      id: moderatorRelation.id,
    },
  });

  return {
    id: moderatorToRemove.id,
    username: moderatorToRemove.username,
    email: moderatorToRemove.email,
    email_verified: moderatorToRemove.email_verified,
    display_name: moderatorToRemove.display_name ?? undefined,
    bio: moderatorToRemove.bio ?? undefined,
    avatar_url: moderatorToRemove.avatar_url ?? undefined,
    post_karma: moderatorToRemove.post_karma,
    comment_karma: moderatorToRemove.comment_karma,
    show_online_status: moderatorToRemove.show_online_status,
    show_subscribed_communities: moderatorToRemove.show_subscribed_communities,
    show_activity_feed: moderatorToRemove.show_activity_feed,
    created_at: toISOStringSafe(moderatorToRemove.created_at),
    updated_at: toISOStringSafe(moderatorToRemove.updated_at),
    deleted_at: moderatorToRemove.deleted_at
      ? toISOStringSafe(moderatorToRemove.deleted_at)
      : undefined,
  };
}
