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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteCommunityPlatformOwnerModerationBansBanId(props: {
  owner: OwnerPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate ban exists and get community_id
  const ban = await MyGlobal.prisma.community_platform_bans.findUnique({
    where: { id: props.banId },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  // Validate owner has permission (owner of the community)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: ban.community_id },
      select: { owner_id: true },
    });
  if (!community || community.owner_id !== props.owner.id) {
    throw new HttpException("Forbidden - Insufficient permissions", 403);
  }
  // Delete the ban record permanently
  await MyGlobal.prisma.community_platform_bans.delete({
    where: { id: props.banId },
  });
  // Log the unban action in moderation_logs
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: props.owner.id, // Fixed: Use snake_case as in schema
      target_id: ban.banned_user_id,
      action_type: "UNBAN",
      community_id: ban.community_id,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
}
