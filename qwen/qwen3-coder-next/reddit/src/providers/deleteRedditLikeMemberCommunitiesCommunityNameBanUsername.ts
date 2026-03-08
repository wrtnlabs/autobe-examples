import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberCommunitiesCommunityNameBanUsername(props: {
  member: MemberPayload;
  communityName: string;
  username: string;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // Find community by name
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Find user to unban by username
  const userToUnban = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      username: props.username,
      deleted_at: null,
    },
  });
  if (!userToUnban) {
    throw new HttpException("User not found", 404);
  }
  // Find ban record
  const ban = await MyGlobal.prisma.reddit_like_bans.findFirst({
    where: {
      reddit_like_community_id: community.id,
      reddit_like_user_id: userToUnban.id,
      deleted_at: null,
    },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  // Check if requesting user has moderator/owner role for community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.member.id,
        community_id: community.id,
        role: {
          in: ["owner", "moderator"],
        },
      },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete ban record
  await MyGlobal.prisma.reddit_like_bans.update({
    where: {
      id: ban.id,
    },
    data: {
      deleted_at: now,
    },
  });
}
