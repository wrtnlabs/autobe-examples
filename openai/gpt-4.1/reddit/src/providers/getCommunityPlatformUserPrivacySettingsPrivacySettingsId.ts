import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPrivacySettings";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserPrivacySettingsPrivacySettingsId(props: {
  user: UserPayload;
  privacySettingsId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPrivacySettings> {
  const settings =
    await MyGlobal.prisma.community_platform_privacy_settings.findUnique({
      where: { id: props.privacySettingsId },
    });

  if (!settings || settings.deleted_at !== null) {
    throw new HttpException("Privacy settings record not found", 404);
  }

  if (settings.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You do not have access to these privacy settings.",
      403,
    );
  }

  return {
    id: settings.id,
    community_platform_user_id: settings.community_platform_user_id,
    profile_visibility: typia.assert<"public" | "private" | "follower_only">(
      settings.profile_visibility,
    ),
    search_discoverable: settings.search_discoverable,
    data_processing_consent: settings.data_processing_consent,
    data_export_enabled: settings.data_export_enabled,
    created_at: toISOStringSafe(settings.created_at),
    updated_at: toISOStringSafe(settings.updated_at),
    deleted_at:
      typeof settings.deleted_at === "string"
        ? settings.deleted_at
        : settings.deleted_at
          ? toISOStringSafe(settings.deleted_at)
          : undefined,
  };
}
