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

export async function putShoppingAdminBusinessSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
  body: IShoppingBusinessSetting.IUpdate;
}): Promise<IShoppingBusinessSetting> {
  const { settingKey, body } = props;
  // Look up existing, active business setting (not soft-deleted)
  const setting = await MyGlobal.prisma.shopping_business_settings.findFirst({
    where: {
      setting_key: settingKey,
      deleted_at: null,
    },
  });
  if (!setting) {
    throw new HttpException("Business setting not found", 404);
  }

  // Update value and description, and set updated_at audit
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_business_settings.update({
    where: { id: setting.id },
    data: {
      setting_value: body.setting_value,
      // Only update description if provided (null allowed)
      description:
        body.description !== undefined ? body.description : undefined,
      updated_at: now,
    },
  });

  // Map updated row to DTO structure
  return {
    id: updated.id,
    setting_key: updated.setting_key,
    setting_value: updated.setting_value,
    description:
      typeof updated.description !== "undefined"
        ? updated.description
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
