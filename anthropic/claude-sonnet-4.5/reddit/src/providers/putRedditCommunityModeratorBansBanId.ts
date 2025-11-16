import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function putRedditCommunityModeratorBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.IUpdate;
}): Promise<IRedditCommunityBan> {
  const existingBan =
    await MyGlobal.prisma.reddit_community_community_bans.findUnique({
      where: { id: props.banId },
    });

  if (!existingBan) {
    throw new HttpException("Ban not found", 404);
  }

  const moderatorCommunityRelation =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: existingBan.reddit_community_community_id,
      },
    });

  if (!moderatorCommunityRelation) {
    throw new HttpException(
      "Forbidden - moderator lacks authority in this community",
      403,
    );
  }

  const updatedBan =
    await MyGlobal.prisma.reddit_community_community_bans.update({
      where: { id: props.banId },
      data: {
        ...(props.body.reason !== undefined && { reason: props.body.reason }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.expires_at !== undefined && {
          expires_at: props.body.expires_at
            ? new Date(props.body.expires_at)
            : null,
        }),
        updated_at: new Date(),
      },
      include: {
        community: true,
        bannedMember: true,
        banningModerator: true,
      },
    });

  return {
    id: updatedBan.id,
    reddit_community_member_id: updatedBan.reddit_community_member_id,
    reddit_community_community_id: updatedBan.reddit_community_community_id,
    reddit_community_moderator_id: updatedBan.reddit_community_moderator_id,
    reason: updatedBan.reason,
    status: updatedBan.status as "active" | "expired" | "lifted",
    expires_at: updatedBan.expires_at
      ? toISOStringSafe(updatedBan.expires_at)
      : null,
    created_at: toISOStringSafe(updatedBan.created_at),
    updated_at: toISOStringSafe(updatedBan.updated_at),
    deleted_at:
      updatedBan.deleted_at === null
        ? undefined
        : updatedBan.deleted_at
          ? toISOStringSafe(updatedBan.deleted_at)
          : undefined,
    community: {
      id: updatedBan.community.id,
      name: updatedBan.community.name,
      display_title: updatedBan.community.display_title,
      created_at: toISOStringSafe(updatedBan.community.created_at),
    },
    banned_member: {
      id: updatedBan.bannedMember.id,
      username: updatedBan.bannedMember.username,
      display_name: updatedBan.bannedMember.display_name ?? undefined,
      bio: updatedBan.bannedMember.bio ?? undefined,
      avatar_url: updatedBan.bannedMember.avatar_url ?? undefined,
      post_karma: updatedBan.bannedMember.post_karma,
      comment_karma: updatedBan.bannedMember.comment_karma,
      created_at: toISOStringSafe(updatedBan.bannedMember.created_at),
    },
    moderator: {
      id: updatedBan.banningModerator.id,
      username: updatedBan.banningModerator.username,
      display_name: updatedBan.banningModerator.display_name ?? undefined,
      avatar_url: updatedBan.banningModerator.avatar_url ?? undefined,
      post_karma: updatedBan.banningModerator.post_karma,
      comment_karma: updatedBan.banningModerator.comment_karma,
      created_at: toISOStringSafe(updatedBan.banningModerator.created_at),
    },
  };
}
