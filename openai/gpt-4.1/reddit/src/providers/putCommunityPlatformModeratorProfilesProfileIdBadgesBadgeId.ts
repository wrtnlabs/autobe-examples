import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorProfilesProfileIdBadgesBadgeId(props: {
  moderator: ModeratorPayload;
  profileId: string & tags.Format<"uuid">;
  badgeId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileBadge.IUpdate;
}): Promise<ICommunityPlatformProfileBadge> {
  const { moderator, profileId, badgeId, body } = props;

  // Fetch the badge, ensure it exists and belongs to the profile
  const badge =
    await MyGlobal.prisma.community_platform_profile_badges.findUnique({
      where: { id: badgeId },
    });
  if (!badge || badge.community_platform_profile_id !== profileId) {
    throw new HttpException("Badge not found for the specified profile.", 404);
  }

  // Fetch the moderator record to check assignment is valid and active
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { member_id: moderator.id },
    });
  if (
    !moderatorRecord ||
    moderatorRecord.deleted_at !== null ||
    moderatorRecord.status !== "active"
  ) {
    throw new HttpException(
      "Moderator not active or not assigned to a community.",
      403,
    );
  }

  // Fetch the profile to verify its existence and grab profile owner
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: { id: profileId },
  });
  if (!profile) {
    throw new HttpException("Profile not found.", 404);
  }

  // Authorization: ensure the profile member is a member of the same community as the moderator
  // We'll allow an update only if moderator's community_id matches the community where the profile member is set as creator
  // Since the community_platform_communities table uses creator_member_id, cross-check that link
  const authorizedCommunity =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: moderatorRecord.community_id,
        creator_member_id: profile.community_platform_member_id,
      },
    });
  if (!authorizedCommunity) {
    throw new HttpException(
      "Moderator not authorized to update badges for this profile.",
      403,
    );
  }

  const now = toISOStringSafe(new Date());
  const update = {
    ...(body.badge_type !== undefined && { badge_type: body.badge_type }),
    ...(body.badge_name !== undefined && { badge_name: body.badge_name }),
    ...(body.issued_at !== undefined && {
      issued_at:
        body.issued_at == null
          ? body.issued_at
          : toISOStringSafe(body.issued_at),
    }),
    ...(body.issuer !== undefined && { issuer: body.issuer }),
    ...(body.revoked_at !== undefined && {
      revoked_at:
        body.revoked_at === null ? null : toISOStringSafe(body.revoked_at),
    }),
    ...(body.revoke_reason !== undefined && {
      revoke_reason: body.revoke_reason,
    }),
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.community_platform_profile_badges.update({
      where: { id: badgeId },
      data: update,
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
    issued_at:
      updated.issued_at != null
        ? toISOStringSafe(updated.issued_at)
        : updated.issued_at,
    issuer: updated.issuer ?? undefined,
    revoked_at:
      updated.revoked_at != null
        ? toISOStringSafe(updated.revoked_at)
        : undefined,
    revoke_reason: updated.revoke_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at != null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
