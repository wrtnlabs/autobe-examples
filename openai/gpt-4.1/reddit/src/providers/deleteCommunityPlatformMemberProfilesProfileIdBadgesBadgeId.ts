import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberProfilesProfileIdBadgesBadgeId(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
  badgeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch badge by ID and profile linkage
  const badge =
    await MyGlobal.prisma.community_platform_profile_badges.findUnique({
      where: { id: props.badgeId },
    });
  if (!badge) throw new HttpException("Badge not found", 404);
  if (badge.community_platform_profile_id !== props.profileId)
    throw new HttpException(
      "Badge does not belong to the specified profile",
      404,
    );

  // 2. Fetch profile and ensure member is the owner
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: { id: props.profileId },
  });
  if (!profile) throw new HttpException("Profile not found", 404);
  if (profile.community_platform_member_id !== props.member.id)
    throw new HttpException(
      "Only profile owner can remove their own badge",
      403,
    );

  // 3. Check already revoked or deleted (soft delete)
  if (badge.revoked_at !== null || badge.deleted_at !== null)
    throw new HttpException("Badge already removed or revoked", 409);

  // 4. Soft delete by setting revoked_at and deleted_at
  const deleteTime = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_profile_badges.update({
    where: { id: props.badgeId },
    data: {
      revoked_at: deleteTime,
      deleted_at: deleteTime,
      updated_at: deleteTime,
    },
  });
}
