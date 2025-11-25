import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPrivacySettings";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserPrivacySettingsPrivacySettingsId(props: {
  user: UserPayload;
  privacySettingsId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPrivacySettings.IUpdate;
}): Promise<ICommunityPlatformPrivacySettings> {
  const record =
    await MyGlobal.prisma.community_platform_privacy_settings.findUnique({
      where: { id: props.privacySettingsId },
    });
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Privacy settings record not found", 404);
  }
  if (record.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: cannot modify privacy settings for another user",
      403,
    );
  }

  const updateFields: Record<string, unknown> = {};
  if (typeof props.body.profile_visibility !== "undefined") {
    updateFields.profile_visibility = props.body.profile_visibility;
  }
  if (typeof props.body.search_discoverable !== "undefined") {
    updateFields.search_discoverable = props.body.search_discoverable;
  }
  if (typeof props.body.data_processing_consent !== "undefined") {
    updateFields.data_processing_consent = props.body.data_processing_consent;
  }
  if (typeof props.body.data_export_enabled !== "undefined") {
    updateFields.data_export_enabled = props.body.data_export_enabled;
  }
  updateFields.updated_at = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.community_platform_privacy_settings.update({
      where: { id: props.privacySettingsId },
      data: updateFields,
    });

  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    profile_visibility: updated.profile_visibility as
      | "public"
      | "private"
      | "follower_only",
    search_discoverable: updated.search_discoverable,
    data_processing_consent: updated.data_processing_consent,
    data_export_enabled: updated.data_export_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
