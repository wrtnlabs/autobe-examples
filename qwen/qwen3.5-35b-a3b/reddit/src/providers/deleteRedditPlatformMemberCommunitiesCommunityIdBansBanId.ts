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

export async function deleteRedditPlatformMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the ban record exists and belongs to the specified community
  const ban =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        banned_by: true,
        deleted_at: true,
        community: {
          select: { owner_id: true },
        },
      },
    });
  // Verify ban belongs to the specified community
  if (ban.community_id !== props.communityId) {
    throw new HttpException("Ban not found in this community", 404);
  }
  // Step 2: Verify the ban is currently active (not already deleted)
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban has already been removed", 404);
  }
  // Step 3: Verify authorization - check if member is owner or moderator
  const isOwner = ban.community.owner_id === props.member.id;
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
      },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Soft delete the ban record by setting deleted_at
  await MyGlobal.prisma.reddit_platform_community_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
