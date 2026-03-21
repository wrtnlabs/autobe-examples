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

export async function deleteRedditCloneMemberCommunitiesCommunityNameBansBanId(props: {
  member: MemberPayload;
  communityName: string;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find community by name
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { name: props.communityName },
    select: { id: true, deleted_at: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Check if member is moderator or owner of the community
  const moderatorRole = await MyGlobal.prisma.reddit_clone_moderators.findFirst(
    {
      where: {
        reddit_clone_community_id: community.id,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (moderatorRole === null) {
    throw new HttpException(
      "You do not have permission to unban users in this community",
      403,
    );
  }
  // 3. Find the ban record
  const ban = await MyGlobal.prisma.reddit_clone_bans.findUnique({
    where: { id: props.banId },
    select: { id: true, reddit_clone_community_id: true, deleted_at: true },
  });
  if (ban === null) {
    throw new HttpException("Ban not found", 404);
  }
  // Verify ban belongs to the specified community
  if (ban.reddit_clone_community_id !== community.id) {
    throw new HttpException("Ban not found", 404);
  }
  // Verify ban is active (not already deleted)
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban not found", 404);
  }
  // 4. Soft delete the ban - set deleted_at and updated_at
  const now = new Date();
  await MyGlobal.prisma.reddit_clone_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // 5. Return void (204 No Content)
}
