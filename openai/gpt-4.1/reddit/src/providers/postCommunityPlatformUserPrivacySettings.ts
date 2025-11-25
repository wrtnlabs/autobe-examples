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

export async function postCommunityPlatformUserPrivacySettings(props: {
  user: UserPayload;
  body: ICommunityPlatformPrivacySettings.ICreate;
}): Promise<ICommunityPlatformPrivacySettings> {
  const existing =
    await MyGlobal.prisma.community_platform_privacy_settings.findFirst({
      where: {
        community_platform_user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      "Privacy settings already exist for this user",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_privacy_settings.create({
      data: {
        id: v4(),
        community_platform_user_id: props.user.id,
        profile_visibility: props.body.profile_visibility,
        search_discoverable: props.body.search_discoverable,
        data_processing_consent: props.body.data_processing_consent,
        data_export_enabled: props.body.data_export_enabled,
        created_at: now,
        updated_at: now,
        // deleted_at intentionally omitted on create
      },
    });
  return {
    id: created.id,
    community_platform_user_id: created.community_platform_user_id,
    profile_visibility: typia.assert<"public" | "private" | "follower_only">(
      created.profile_visibility,
    ),
    search_discoverable: created.search_discoverable,
    data_processing_consent: created.data_processing_consent,
    data_export_enabled: created.data_export_enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : created.deleted_at,
  };
}
