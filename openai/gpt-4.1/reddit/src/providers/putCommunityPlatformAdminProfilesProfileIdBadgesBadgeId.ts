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

export async function putCommunityPlatformAdminProfilesProfileIdBadgesBadgeId(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
  badgeId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileBadge.IUpdate;
}): Promise<ICommunityPlatformProfileBadge> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 1. Fetch and verify badge exists and is linked to the given profile
  const original =
    await MyGlobal.prisma.community_platform_profile_badges.findUnique({
      where: { id: props.badgeId },
    });
  if (!original || original.community_platform_profile_id !== props.profileId) {
    throw new HttpException(
      "Badge not found for this profile or does not belong to profile.",
      404,
    );
  }
  // 2. Only update fields if they are provided in body, else skip.
  const updated =
    await MyGlobal.prisma.community_platform_profile_badges.update({
      where: { id: props.badgeId },
      data: {
        badge_type: props.body.badge_type ?? undefined,
        badge_name: props.body.badge_name ?? undefined,
        issued_at:
          props.body.issued_at !== undefined
            ? toISOStringSafe(props.body.issued_at)
            : undefined,
        issuer: props.body.issuer !== undefined ? props.body.issuer : undefined,
        revoked_at:
          props.body.revoked_at !== undefined
            ? props.body.revoked_at === null
              ? null
              : toISOStringSafe(props.body.revoked_at)
            : undefined,
        revoke_reason:
          props.body.revoke_reason !== undefined
            ? props.body.revoke_reason
            : undefined,
        updated_at: now,
      },
    });
  // 3. Return updated badge as ICommunityPlatformProfileBadge (strict type, all required fields)
  return {
    id: updated.id,
    community_platform_profile_id: updated.community_platform_profile_id,
    community_platform_karma_award_id:
      updated.community_platform_karma_award_id ?? undefined,
    badge_type: updated.badge_type,
    badge_name: updated.badge_name,
    issued_at: toISOStringSafe(updated.issued_at),
    issuer: updated.issuer ?? undefined,
    revoked_at:
      updated.revoked_at !== undefined
        ? updated.revoked_at === null
          ? null
          : toISOStringSafe(updated.revoked_at)
        : undefined,
    revoke_reason: updated.revoke_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined
        ? updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
