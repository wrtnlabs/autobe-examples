import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfilePreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfilePreferences";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminProfilesProfileIdPreferences(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformProfilePreferences> {
  const pref =
    await MyGlobal.prisma.community_platform_profile_preferences.findFirst({
      where: {
        community_platform_profile_id: props.profileId,
      },
    });
  if (!pref) {
    throw new HttpException("Profile preferences not found", 404);
  }
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
