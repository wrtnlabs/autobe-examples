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

export async function deleteRedditPlatformMemberCommunitiesCommunityIdBansUserId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Check if community exists and get owner
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_id: true },
    });
  // Step 2: Check if requester is owner or moderator
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          community_id: props.communityId,
          user_id: props.member.id,
        },
      });
    if (!moderator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 3: Find active ban record (deleted_at IS NULL means active)
  const ban =
    await MyGlobal.prisma.reddit_platform_community_bans.findFirstOrThrow({
      where: {
        community_id: props.communityId,
        user_id: props.userId,
        deleted_at: null,
      },
    });
  // Step 4: Soft delete ban (unban) by setting deleted_at
  const timestamp: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.reddit_platform_community_bans.update({
    where: { id: ban.id },
    data: {
      deleted_at: timestamp,
      updated_at: timestamp,
    },
  });
  // Step 5: Create audit log entry
  await MyGlobal.prisma.reddit_platform_moderator_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_id: props.communityId,
      user_id: props.userId,
      acted_by_id: props.member.id,
      action_type: "UNBANNED",
      notes: undefined,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    },
  });
}
