import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneModeratorCommunitiesCommunityIdBansUserId(props: {
  moderator: ModeratorPayload;
  communityId: string;
  userId: string;
}): Promise<void> {
  // Verify the community exists
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: {
      id: props.communityId,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify the user exists
  const user = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      id: props.userId,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Verify the user is actually banned
  const banRecord = await MyGlobal.prisma.reddit_clone_ban_records.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.userId,
      is_active: true,
    },
  });
  if (!banRecord) {
    throw new HttpException("Ban record not found or already inactive", 404);
  }
  // Verify the requester has permission (must be owner or moderator of the community)
  const isOwner = await MyGlobal.prisma.reddit_clone_owners.findFirst({
    where: {
      id: props.moderator.id,
    },
  });
  const isModerator =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.findFirst({
      where: {
        appointed_actor_id: props.moderator.id,
        community_id: props.communityId,
      },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the ban record
  await MyGlobal.prisma.reddit_clone_ban_records.delete({
    where: {
      id: banRecord.id,
    },
  });
  // Log the unban action
  await MyGlobal.prisma.reddit_clone_moderation_logs.create({
    data: {
      id: v4(),
      moderator_id: props.moderator.id,
      action_type: "unban_user",
      target_type: "user",
      reason: `User ${props.userId} unbanned from community ${props.communityId}`,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
