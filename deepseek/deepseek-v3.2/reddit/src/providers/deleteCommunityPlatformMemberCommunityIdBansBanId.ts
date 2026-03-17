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

export async function deleteCommunityPlatformMemberCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string;
  banId: string;
}): Promise<void> {
  // Check moderator permission
  const moderatorRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify ban exists and belongs to community
  const ban = await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
    where: { id: props.banId },
    select: { community_id: true, active: true },
  });
  // Check community mismatch
  if (ban.community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to this community", 400);
  }
  // Check if already inactive
  if (!ban.active) {
    throw new HttpException("Ban is already inactive", 409);
  }
  // Update ban to unban
  await MyGlobal.prisma.community_platform_bans.update({
    where: { id: props.banId },
    data: {
      unbanned_at: new Date(),
      active: false,
      updated_at: new Date(),
    },
  });
}
