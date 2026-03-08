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

export async function deleteRedditLikeMemberCommunitiesCommunityNameModeratorsUsername(props: {
  member: MemberPayload;
  communityName: string;
  username: string;
}): Promise<void> {
  // Find the target community by name (case-insensitive matching)
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      name: props.communityName.toLowerCase(),
      deleted_at: null,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check if requesting member is authorized (must be community owner)
  const memberRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.member.id,
        community_id: community.id,
      },
    });
  // Only community owner can remove moderators
  if (memberRole === null || memberRole.role !== "owner") {
    throw new HttpException("Forbidden", 403);
  }
  // Find the target member by username
  const targetMember = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      username: props.username,
      deleted_at: null,
    },
  });
  if (targetMember === null) {
    throw new HttpException("User not found", 404);
  }
  // Find the moderator role to be deleted
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: targetMember.id,
        community_id: community.id,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException("Moderator role not found", 404);
  }
  // Check if this is the only owner - prevent orphaning the community
  if (moderatorRole.role === "owner") {
    const otherOwners = await MyGlobal.prisma.reddit_like_moderator_roles.count(
      {
        where: {
          community_id: community.id,
          role: "owner",
          NOT: { id: moderatorRole.id },
        },
      },
    );
    if (otherOwners === 0) {
      throw new HttpException("Cannot remove the only owner", 400);
    }
  }
  // Delete the moderator role
  await MyGlobal.prisma.reddit_like_moderator_roles.delete({
    where: { id: moderatorRole.id },
  });
}
