import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSystemSettingsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSystemSetting> {
  const { admin, id } = props;
  const setting =
    await MyGlobal.prisma.shopping_mall_system_settings.findUnique({
      where: { id },
    });
  if (!setting || setting.deleted_at !== null) {
    throw new HttpException(`System setting not found`, 404);
  }
  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    description: setting.description ?? null,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
    deleted_at: setting.deleted_at ? toISOStringSafe(setting.deleted_at) : null,
  };
}
