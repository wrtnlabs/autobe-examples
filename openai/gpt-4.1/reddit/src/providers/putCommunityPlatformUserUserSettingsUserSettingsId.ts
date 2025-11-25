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

export async function putCommunityPlatformUserUserSettingsUserSettingsId(props: {
  user: UserPayload;
  userSettingsId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserSettings.IUpdate;
}): Promise<ICommunityPlatformUserSettings> {
  const existing =
    await MyGlobal.prisma.community_platform_user_settings.findUnique({
      where: { id: props.userSettingsId },
    });
  if (!existing) {
    throw new HttpException("Settings record not found.", 404);
  }
  if (existing.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted settings record.", 400);
  }
  if (existing.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "You are not allowed to update another user's settings.",
      403,
    );
  }
  const updated = await MyGlobal.prisma.community_platform_user_settings.update(
    {
      where: { id: props.userSettingsId },
      data: {
        ...(props.body.language !== undefined && {
          language: props.body.language,
        }),
        ...(props.body.theme !== undefined && { theme: props.body.theme }),
        ...(props.body.default_post_sort !== undefined && {
          default_post_sort: props.body.default_post_sort,
        }),
        ...(props.body.feature_toggles !== undefined && {
          feature_toggles: props.body.feature_toggles,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    language: updated.language,
    theme: updated.theme,
    default_post_sort: updated.default_post_sort,
    feature_toggles: updated.feature_toggles,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...(typeof updated.deleted_at === "undefined"
      ? {}
      : {
          deleted_at:
            updated.deleted_at === null
              ? null
              : toISOStringSafe(updated.deleted_at),
        }),
  };
}
