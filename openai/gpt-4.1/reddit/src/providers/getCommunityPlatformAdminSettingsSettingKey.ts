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

export async function getCommunityPlatformAdminSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
}): Promise<ICommunityPlatformSettings> {
  const setting = await MyGlobal.prisma.community_platform_settings.findFirst({
    where: {
      setting_key: props.settingKey,
    },
  });
  if (!setting) {
    throw new HttpException("Platform setting not found", 404);
  }
  return {
    id: setting.id,
    setting_key: setting.setting_key,
    value: setting.value,
    type: setting.type,
    description: setting.description,
    is_active: setting.is_active,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
  };
}
