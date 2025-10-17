import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfilePreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfilePreferences";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberProfilesProfileIdPreferences(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformProfilePreferences> {
  // Step 1: Fetch profile, validate ownership
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: { id: props.profileId },
  });
  if (!profile || profile.deleted_at !== null) {
    throw new HttpException("Profile not found", 404);
  }
  if (profile.community_platform_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Only the profile owner can view preferences",
      403,
    );
  }

  // Step 2: Fetch preferences row
  const pref =
    await MyGlobal.prisma.community_platform_profile_preferences.findUnique({
      where: { community_platform_profile_id: props.profileId },
    });
  if (!pref) {
    throw new HttpException("Profile preferences not found", 404);
  }

  // Step 3: Map to DTO with null/undefined handling, and strict date/time branding
  return {
    id: pref.id,
    community_platform_profile_id: pref.community_platform_profile_id,
    language: pref.language ?? undefined,
    theme: pref.theme ?? undefined,
    show_email: pref.show_email,
    show_badges: pref.show_badges,
    allow_messages_from_nonfollowers: pref.allow_messages_from_nonfollowers,
    notification_settings: pref.notification_settings ?? undefined,
    created_at: toISOStringSafe(pref.created_at),
    updated_at: toISOStringSafe(pref.updated_at),
    deleted_at: pref.deleted_at ? toISOStringSafe(pref.deleted_at) : undefined,
  };
}
