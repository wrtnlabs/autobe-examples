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

export async function deleteCommunityMemberCommunitiesCommunityNameBansBanId(props: {
  member: MemberPayload;
  communityName: string;
  banId: string;
}): Promise<void> {
  // Find community by name (case-insensitive lookup)
  const community =
    await MyGlobal.prisma.community_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // Find the ban record and verify it belongs to this community
  const ban = await MyGlobal.prisma.community_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
      community_id: community.id,
    },
    select: {
      id: true,
      member_id: true,
    },
  });
  // Check if current user is a moderator or owner of this community
  const currentModerator = await MyGlobal.prisma.community_moderators.findFirst(
    {
      where: {
        community_id: community.id,
        member_id: props.member.id,
      },
      select: {
        id: true,
        is_owner: true,
      },
    },
  );
  if (currentModerator === null) {
    throw new HttpException(
      "Forbidden: You are not a moderator of this community",
      403,
    );
  }
  // Check if banned member is the community owner - owner cannot be unbanned
  if (ban.member_id === community.owner_id) {
    throw new HttpException("Forbidden: Cannot unban the community owner", 403);
  }
  // Check if banned member is a moderator - only owner can unban moderators
  const bannedMemberModerator =
    await MyGlobal.prisma.community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: ban.member_id,
      },
      select: {
        id: true,
        is_owner: true,
      },
    });
  if (bannedMemberModerator !== null && !currentModerator.is_owner) {
    throw new HttpException(
      "Forbidden: Only the community owner can unban moderators",
      403,
    );
  }
  // Execute deletion and audit logging in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the ban record
    await tx.community_bans.delete({
      where: {
        id: props.banId,
      },
    });
    // Create moderation log entry
    const log = await tx.community_moderation_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: community.id,
        actor_id: props.member.id,
        action_type: "USER_UNBANNED",
        created_at: new Date(),
      },
    });
    // Create member target reference for the unban action
    await tx.community_moderation_log_member_targets.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_moderation_log_id: log.id,
        community_member_id: ban.member_id,
        created_at: new Date(),
      },
    });
  });
}
