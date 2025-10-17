import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminProfilesProfileIdBadges(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileBadge.ICreate;
}): Promise<ICommunityPlatformProfileBadge> {
  const { admin, profileId, body } = props;

  // 1. Ensure the target profile exists and is not deleted
  const profile = await MyGlobal.prisma.community_platform_profiles.findFirst({
    where: {
      id: profileId,
      deleted_at: null,
    },
  });
  if (!profile) {
    throw new HttpException("Profile not found.", 404);
  }
  // 2. Ensure uniqueness of badge (profile, badge_type, badge_name, not deleted)
  const conflict =
    await MyGlobal.prisma.community_platform_profile_badges.findFirst({
      where: {
        community_platform_profile_id: profileId,
        badge_type: body.badge_type,
        badge_name: body.badge_name,
        deleted_at: null,
      },
    });
  if (conflict) {
    throw new HttpException("Badge already assigned to this profile.", 409);
  }
  // 3. Create the badge assignment
  const now = toISOStringSafe(new Date());
  const issuedAt = body.issued_at ? toISOStringSafe(body.issued_at) : now;
  const badge = await MyGlobal.prisma.community_platform_profile_badges.create({
    data: {
      id: v4(),
      community_platform_profile_id: profileId,
      community_platform_karma_award_id:
        body.community_platform_karma_award_id ?? null,
      badge_type: body.badge_type,
      badge_name: body.badge_name,
      issued_at: issuedAt,
      issuer: body.issuer ?? null,
      revoked_at: null,
      revoke_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: badge.id,
    community_platform_profile_id: badge.community_platform_profile_id,
    community_platform_karma_award_id:
      badge.community_platform_karma_award_id ?? undefined,
    badge_type: badge.badge_type,
    badge_name: badge.badge_name,
    issued_at: toISOStringSafe(badge.issued_at),
    issuer: badge.issuer ?? undefined,
    revoked_at:
      badge.revoked_at != null ? toISOStringSafe(badge.revoked_at) : undefined,
    revoke_reason: badge.revoke_reason ?? undefined,
    created_at: toISOStringSafe(badge.created_at),
    updated_at: toISOStringSafe(badge.updated_at),
    deleted_at:
      badge.deleted_at != null ? toISOStringSafe(badge.deleted_at) : undefined,
  };
}
