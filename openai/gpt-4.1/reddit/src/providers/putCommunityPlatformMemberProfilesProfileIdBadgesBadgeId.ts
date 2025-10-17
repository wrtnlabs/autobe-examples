import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberProfilesProfileIdBadgesBadgeId(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
  badgeId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileBadge.IUpdate;
}): Promise<ICommunityPlatformProfileBadge> {
  // Find the badge record
  const badge =
    await MyGlobal.prisma.community_platform_profile_badges.findUnique({
      where: { id: props.badgeId },
    });
  if (!badge) {
    throw new HttpException("Badge not found", 404);
  }
  if (badge.community_platform_profile_id !== props.profileId) {
    throw new HttpException("Badge does not belong to specified profile", 404);
  }

  // Find owning profile for member authentication
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: { id: props.profileId },
  });
  if (!profile) {
    throw new HttpException("Profile not found", 404);
  }
  if (profile.community_platform_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Only the profile owner can update this badge",
      403,
    );
  }

  // Prepare IUpdate fields, only updatable by specification
  const now = toISOStringSafe(new Date());
  const updateFields = {
    ...(props.body.badge_type !== undefined && {
      badge_type: props.body.badge_type,
    }),
    ...(props.body.badge_name !== undefined && {
      badge_name: props.body.badge_name,
    }),
    ...(props.body.issued_at !== undefined && {
      issued_at: props.body.issued_at,
    }),
    ...(props.body.issuer !== undefined && { issuer: props.body.issuer }),
    ...(props.body.revoked_at !== undefined && {
      revoked_at: props.body.revoked_at,
    }),
    ...(props.body.revoke_reason !== undefined && {
      revoke_reason: props.body.revoke_reason,
    }),
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.community_platform_profile_badges.update({
      where: { id: props.badgeId },
      data: updateFields,
    });

  return {
    id: updated.id,
    community_platform_profile_id: updated.community_platform_profile_id,
    community_platform_karma_award_id:
      updated.community_platform_karma_award_id === null
        ? undefined
        : updated.community_platform_karma_award_id,
    badge_type: updated.badge_type,
    badge_name: updated.badge_name,
    issued_at: toISOStringSafe(updated.issued_at),
    issuer: updated.issuer === null ? undefined : updated.issuer,
    revoked_at:
      updated.revoked_at === null
        ? undefined
        : toISOStringSafe(updated.revoked_at),
    revoke_reason:
      updated.revoke_reason === null ? undefined : updated.revoke_reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
