import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";

export async function getCommunityPlatformProfilesProfileIdBadgesBadgeId(props: {
  profileId: string & tags.Format<"uuid">;
  badgeId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformProfileBadge> {
  const badge =
    await MyGlobal.prisma.community_platform_profile_badges.findUnique({
      where: { id: props.badgeId },
    });
  if (!badge || badge.community_platform_profile_id !== props.profileId) {
    throw new HttpException(
      "Badge not found or not assigned to the specified profile",
      404,
    );
  }
  return {
    id: badge.id,
    community_platform_profile_id: badge.community_platform_profile_id,
    community_platform_karma_award_id:
      badge.community_platform_karma_award_id ?? undefined,
    badge_type: badge.badge_type,
    badge_name: badge.badge_name,
    issued_at: toISOStringSafe(badge.issued_at),
    issuer: badge.issuer ?? undefined,
    revoked_at: badge.revoked_at
      ? toISOStringSafe(badge.revoked_at)
      : undefined,
    revoke_reason: badge.revoke_reason ?? undefined,
    created_at: toISOStringSafe(badge.created_at),
    updated_at: toISOStringSafe(badge.updated_at),
    deleted_at: badge.deleted_at
      ? toISOStringSafe(badge.deleted_at)
      : undefined,
  };
}
