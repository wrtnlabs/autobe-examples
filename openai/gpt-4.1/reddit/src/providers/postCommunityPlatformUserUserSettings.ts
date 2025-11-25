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

export async function postCommunityPlatformUserUserSettings(props: {
  user: UserPayload;
  body: ICommunityPlatformUserSettings.ICreate;
}): Promise<ICommunityPlatformUserSettings> {
  const existing =
    await MyGlobal.prisma.community_platform_user_settings.findFirst({
      where: {
        community_platform_user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("User settings already exist for this user.", 409);
  }

  // Current ISO string for audit fields
  const now = toISOStringSafe(new Date());

  // Create the user settings record
  const created = await MyGlobal.prisma.community_platform_user_settings.create(
    {
      data: {
        id: v4(),
        community_platform_user_id: props.user.id,
        language: props.body.language,
        theme: props.body.theme,
        default_post_sort: props.body.default_post_sort,
        feature_toggles: props.body.feature_toggles,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    community_platform_user_id: created.community_platform_user_id,
    language: created.language,
    theme: created.theme,
    default_post_sort: created.default_post_sort,
    feature_toggles: created.feature_toggles,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : created.deleted_at,
  };
}
