import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function getRedditCommunityModeratorsUsernameProfile(props: {
  username: string;
}): Promise<IRedditCommunityCommunityModerator> {
  const moderator =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: { username: props.username },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  return {
    id: moderator.id,
    username: moderator.username,
    email: moderator.email,
    email_verified: moderator.email_verified,
    display_name: moderator.display_name ?? undefined,
    bio: moderator.bio ?? undefined,
    avatar_url: moderator.avatar_url ?? undefined,
    post_karma: moderator.post_karma,
    comment_karma: moderator.comment_karma,
    show_online_status: moderator.show_online_status,
    show_subscribed_communities: moderator.show_subscribed_communities,
    show_activity_feed: moderator.show_activity_feed,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
  };
}
