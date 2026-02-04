import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorModerationBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ban = await MyGlobal.prisma.community_platform_bans.findUnique({
    where: { id: props.banId },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  // Verify the moderator has authority over the community associated with this ban
  const hasAuthority =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id, // Fixed: 'member' -> 'member_id' as per schema
        community_id: ban.community_id,
        deleted_at: null,
        community_platform_member_sessions: {
          some: {
            id: props.moderator.session_id,
            expired_at: { gt: new Date() },
          },
        },
      },
    });
  if (!hasAuthority) {
    throw new HttpException(
      "Forbidden - Not authorized to unban from this community",
      403,
    );
  }
  // Permanently delete the ban record
  await MyGlobal.prisma.community_platform_bans.delete({
    where: { id: props.banId },
  });
  // Log the unban action in moderation_logs
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      actor_id: props.moderator.id, // Fixed: 'actor' -> 'actor_id' as per schema
      target: ban.banned_user_id,
      action_type: "UNBAN",
      description: "Unban action performed by moderator",
      created_at: toISOStringSafe(new Date()),
      code: "UNBAN",
      subject: "BAN",
      community_id: ban.community_id,
      parent_id: null,
      decline_reason: null,
    },
  });
}
