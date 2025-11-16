import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPrivacySettings";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorPrivacySettingsPrivacySettingsId(props: {
  administrator: AdministratorPayload;
  privacySettingsId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPrivacySettings.IUpdate;
}): Promise<ICommunityPlatformPrivacySettings> {
  const existing =
    await MyGlobal.prisma.community_platform_privacy_settings.findUnique({
      where: { id: props.privacySettingsId },
    });
  if (!existing) {
    throw new HttpException("Privacy settings not found", 404);
  }
  const updated =
    await MyGlobal.prisma.community_platform_privacy_settings.update({
      where: { id: props.privacySettingsId },
      data: {
        ...(props.body.profile_visibility !== undefined && {
          profile_visibility: props.body.profile_visibility,
        }),
        ...(props.body.search_discoverable !== undefined && {
          search_discoverable: props.body.search_discoverable,
        }),
        ...(props.body.data_processing_consent !== undefined && {
          data_processing_consent: props.body.data_processing_consent,
        }),
        ...(props.body.data_export_enabled !== undefined && {
          data_export_enabled: props.body.data_export_enabled,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    profile_visibility: typia.assert<"public" | "private" | "follower_only">(
      updated.profile_visibility,
    ),
    search_discoverable: updated.search_discoverable,
    data_processing_consent: updated.data_processing_consent,
    data_export_enabled: updated.data_export_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
