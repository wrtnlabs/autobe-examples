import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSettings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
  body: ICommunityPlatformSettings.IUpdate;
}): Promise<ICommunityPlatformSettings> {
  const setting = await MyGlobal.prisma.community_platform_settings.findUnique({
    where: { setting_key: props.settingKey },
  });
  if (!setting) {
    throw new HttpException("Platform setting not found", 404);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_settings.update({
    where: { setting_key: props.settingKey },
    data: {
      value: props.body.value,
      type: props.body.type,
      description: props.body.description,
      is_active: props.body.is_active,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    setting_key: updated.setting_key,
    value: updated.value,
    type: updated.type,
    description: updated.description,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
