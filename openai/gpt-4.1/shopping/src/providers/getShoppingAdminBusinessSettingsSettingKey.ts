import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingBusinessSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminBusinessSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
}): Promise<IShoppingBusinessSetting> {
  const setting = await MyGlobal.prisma.shopping_business_settings.findFirst({
    where: {
      setting_key: props.settingKey,
      deleted_at: null,
    },
  });
  if (!setting) {
    throw new HttpException("Business setting not found", 404);
  }
  return {
    id: setting.id,
    setting_key: setting.setting_key,
    setting_value: setting.setting_value,
    description:
      setting.description === undefined ? undefined : setting.description,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
    deleted_at:
      setting.deleted_at === undefined || setting.deleted_at === null
        ? undefined
        : toISOStringSafe(setting.deleted_at),
  };
}
