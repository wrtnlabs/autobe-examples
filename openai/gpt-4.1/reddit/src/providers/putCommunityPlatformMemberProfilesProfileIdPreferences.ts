import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfilePreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfilePreference";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberProfilesProfileIdPreferences(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfilePreference.IUpdate;
}): Promise<ICommunityPlatformProfilePreference> {
  const { member, profileId, body } = props;

  // First, verify profile exists and belongs to this member
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: { id: profileId },
    select: { community_platform_member_id: true, id: true },
  });
  if (!profile) throw new HttpException("Profile not found", 404);
  if (profile.community_platform_member_id !== member.id) {
    throw new HttpException(
      "Forbidden: You may only update your own profile preferences",
      403,
    );
  }

  // Find the preferences row for this profile
  const pref =
    await MyGlobal.prisma.community_platform_profile_preferences.findUnique({
      where: { community_platform_profile_id: profileId },
    });
  if (!pref) throw new HttpException("Profile preferences not found", 404);

  // Update, allowing undefined to skip fields and null to clear where allowed
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_profile_preferences.update({
      where: { community_platform_profile_id: profileId },
      data: {
        language: body.language ?? undefined,
        theme: body.theme ?? undefined,
        show_email: body.show_email ?? undefined,
        show_badges: body.show_badges ?? undefined,
        allow_messages_from_nonfollowers:
          body.allow_messages_from_nonfollowers ?? undefined,
        notification_settings: body.notification_settings ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    community_platform_profile_id: updated.community_platform_profile_id,
    language: updated.language ?? undefined,
    theme: updated.theme ?? undefined,
    show_email: updated.show_email,
    show_badges: updated.show_badges,
    allow_messages_from_nonfollowers: updated.allow_messages_from_nonfollowers,
    notification_settings: updated.notification_settings ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
