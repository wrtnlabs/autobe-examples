import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityBan> {
  const ban = await MyGlobal.prisma.reddit_community_community_bans.findFirst({
    where: {
      id: props.banId,
      deleted_at: null,
    },
    include: {
      community: true,
      bannedMember: true,
      banningModerator: true,
    },
  });

  if (!ban) {
    throw new HttpException("Community ban not found", 404);
  }

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        community_id: ban.reddit_community_community_id,
        member_id: props.moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "You do not have moderator authority in this community",
      403,
    );
  }

  return {
    id: ban.id,
    reddit_community_member_id: ban.reddit_community_member_id,
    reddit_community_community_id: ban.reddit_community_community_id,
    reddit_community_moderator_id: ban.reddit_community_moderator_id,
    reason: ban.reason,
    status: ban.status as "active" | "expired" | "lifted",
    expires_at: ban.expires_at ? toISOStringSafe(ban.expires_at) : null,
    created_at: toISOStringSafe(ban.created_at),
    updated_at: toISOStringSafe(ban.updated_at),
    deleted_at:
      ban.deleted_at === null ? undefined : toISOStringSafe(ban.deleted_at),
    community: {
      id: ban.community.id,
      name: ban.community.name,
      display_title: ban.community.display_title,
      created_at: toISOStringSafe(ban.community.created_at),
    },
    banned_member: {
      id: ban.bannedMember.id,
      username: ban.bannedMember.username,
      display_name:
        ban.bannedMember.display_name === null
          ? undefined
          : ban.bannedMember.display_name,
      bio: ban.bannedMember.bio === null ? undefined : ban.bannedMember.bio,
      avatar_url:
        ban.bannedMember.avatar_url === null
          ? undefined
          : ban.bannedMember.avatar_url,
      post_karma: ban.bannedMember.post_karma,
      comment_karma: ban.bannedMember.comment_karma,
      created_at: toISOStringSafe(ban.bannedMember.created_at),
    },
    moderator: {
      id: ban.banningModerator.id,
      username: ban.banningModerator.username,
      display_name:
        ban.banningModerator.display_name === null
          ? undefined
          : ban.banningModerator.display_name,
      avatar_url:
        ban.banningModerator.avatar_url === null
          ? undefined
          : ban.banningModerator.avatar_url,
      post_karma: ban.banningModerator.post_karma,
      comment_karma: ban.banningModerator.comment_karma,
      created_at: toISOStringSafe(ban.banningModerator.created_at),
    },
  };
}
