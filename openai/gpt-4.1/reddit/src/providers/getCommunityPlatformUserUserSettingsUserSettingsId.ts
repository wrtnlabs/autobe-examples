import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserUserSettingsUserSettingsId(props: {
  user: UserPayload;
  userSettingsId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserSettings> {
  const record =
    await MyGlobal.prisma.community_platform_user_settings.findUnique({
      where: { id: props.userSettingsId },
    });
  if (!record) {
    throw new HttpException("User settings not found.", 404);
  }
  if (props.user.type !== "user") {
    throw new HttpException("Forbidden.", 403);
  }
  if (record.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You do not have access to these user settings.",
      403,
    );
  }
  return {
    id: record.id,
    community_platform_user_id: record.community_platform_user_id,
    language: record.language,
    theme: record.theme,
    default_post_sort: record.default_post_sort,
    feature_toggles: record.feature_toggles,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    ...(record.deleted_at !== undefined
      ? {
          deleted_at:
            record.deleted_at === null
              ? null
              : toISOStringSafe(record.deleted_at),
        }
      : {}),
  };
}
