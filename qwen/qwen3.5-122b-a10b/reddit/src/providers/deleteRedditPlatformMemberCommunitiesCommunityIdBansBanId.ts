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
  // 1. Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Check authorization - owner or moderator
  const isOwner = community.owner_id === props.member.id;
  let isModerator = false;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          reddit_platform_member_id: props.member.id,
          reddit_platform_community_id: props.communityId,
          deleted_at: null,
        },
      });
    isModerator = !!moderator;
  }
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Retrieve ban record
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findUnique({
    where: { id: props.banId },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  // 4. Verify ban belongs to the specified community
  if (ban.reddit_platform_community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to this community", 409);
  }
  // 5. Verify ban is not already deleted
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban already deleted", 404);
  }
  // 6. Soft delete the ban
  await MyGlobal.prisma.reddit_platform_community_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
