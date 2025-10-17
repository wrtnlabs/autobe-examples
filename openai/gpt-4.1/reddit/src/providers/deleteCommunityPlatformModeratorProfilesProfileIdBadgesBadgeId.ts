import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorProfilesProfileIdBadgesBadgeId(props: {
  moderator: ModeratorPayload;
  profileId: string & tags.Format<"uuid">;
  badgeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the badge by badgeId
  const badge =
    await MyGlobal.prisma.community_platform_profile_badges.findUnique({
      where: { id: props.badgeId },
    });

  if (!badge || badge.deleted_at !== null) {
    throw new HttpException("Badge not found", 404);
  }

  // Step 2: Confirm badge belongs to the specified profile
  if (badge.community_platform_profile_id !== props.profileId) {
    throw new HttpException("Badge does not belong to this profile", 404);
  }

  // Step 3: Soft-delete (set deleted_at and revoked_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_profile_badges.update({
    where: { id: props.badgeId },
    data: {
      deleted_at: now,
      revoked_at: now,
      revoke_reason: "Revoked by moderator",
    },
  });

  // (Audit log could be inserted here if applicable)
  return;
}
