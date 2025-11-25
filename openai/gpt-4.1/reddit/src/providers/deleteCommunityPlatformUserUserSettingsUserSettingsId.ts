import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserUserSettingsUserSettingsId(props: {
  user: UserPayload;
  userSettingsId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserSettings> {
  // Fetch the user settings record that is not yet soft-deleted.
  const userSettings =
    await MyGlobal.prisma.community_platform_user_settings.findFirst({
      where: {
        id: props.userSettingsId,
        deleted_at: null,
      },
    });

  if (!userSettings) {
    throw new HttpException("User settings not found or already deleted.", 404);
  }

  // Only permit the owner to perform the deletion.
  if (userSettings.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to delete these settings.",
      403,
    );
  }

  // Save the original state for return (audit). We do not mutate or cast Date types; all fields are passed as is.
  const beforeDelete: ICommunityPlatformUserSettings = {
    id: userSettings.id,
    community_platform_user_id: userSettings.community_platform_user_id,
    language: userSettings.language,
    theme: userSettings.theme,
    default_post_sort: userSettings.default_post_sort,
    feature_toggles: userSettings.feature_toggles,
    created_at: toISOStringSafe(userSettings.created_at),
    updated_at: toISOStringSafe(userSettings.updated_at),
    deleted_at:
      userSettings.deleted_at === null
        ? undefined
        : toISOStringSafe(userSettings.deleted_at),
  };

  // Soft-delete by updating deleted_at to now (string ISO8601 format).
  await MyGlobal.prisma.community_platform_user_settings.update({
    where: { id: props.userSettingsId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  return beforeDelete;
}
