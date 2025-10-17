import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminProfilesProfileIdBadgesBadgeId(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
  badgeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify badge exists and is linked to profileId
  const badge =
    await MyGlobal.prisma.community_platform_profile_badges.findUnique({
      where: { id: props.badgeId },
    });
  if (!badge) {
    throw new HttpException("Badge not found", 404);
  }
  if (badge.community_platform_profile_id !== props.profileId) {
    throw new HttpException("Badge does not belong to this profile", 404);
  }
  // 2. Soft delete: set revoked_at and deleted_at timestamps
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_profile_badges.update({
    where: { id: props.badgeId },
    data: {
      revoked_at: now,
      deleted_at: now,
      updated_at: now,
    },
  });
}
