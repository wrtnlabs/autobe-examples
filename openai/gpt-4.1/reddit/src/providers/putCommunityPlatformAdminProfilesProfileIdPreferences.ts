import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfilePreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfilePreference";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminProfilesProfileIdPreferences(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfilePreference.IUpdate;
}): Promise<ICommunityPlatformProfilePreference> {
  const preference =
    await MyGlobal.prisma.community_platform_profile_preferences.findUnique({
      where: { community_platform_profile_id: props.profileId },
    });
  if (!preference) {
    throw new HttpException("Profile preference not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const updatePayload = {
    ...(props.body.language !== undefined
      ? { language: props.body.language }
      : {}),
    ...(props.body.theme !== undefined ? { theme: props.body.theme } : {}),
    ...(props.body.show_email !== undefined
      ? { show_email: props.body.show_email }
      : {}),
    ...(props.body.show_badges !== undefined
      ? { show_badges: props.body.show_badges }
      : {}),
    ...(props.body.allow_messages_from_nonfollowers !== undefined
      ? {
          allow_messages_from_nonfollowers:
            props.body.allow_messages_from_nonfollowers,
        }
      : {}),
    ...(props.body.notification_settings !== undefined
      ? { notification_settings: props.body.notification_settings }
      : {}),
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.community_platform_profile_preferences.update({
      where: { id: preference.id },
      data: updatePayload,
    });

  return {
    id: updated.id,
    community_platform_profile_id: updated.community_platform_profile_id,
    language: typeof updated.language === "undefined" ? null : updated.language,
    theme: typeof updated.theme === "undefined" ? null : updated.theme,
    show_email: updated.show_email,
    show_badges: updated.show_badges,
    allow_messages_from_nonfollowers: updated.allow_messages_from_nonfollowers,
    notification_settings:
      typeof updated.notification_settings === "undefined"
        ? null
        : updated.notification_settings,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? null
        : toISOStringSafe(updated.deleted_at),
  };
}
