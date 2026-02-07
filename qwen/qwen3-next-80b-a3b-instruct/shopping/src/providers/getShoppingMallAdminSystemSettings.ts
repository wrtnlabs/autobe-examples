import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSystemSettingTransformer } from "../transformers/ShoppingMallSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSystemSettings(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallSystemSetting> {
  const settings =
    await MyGlobal.prisma.shopping_mall_system_settings.findFirst({
      ...ShoppingMallSystemSettingTransformer.select(),
    });
  if (!settings) {
    throw new HttpException("System settings not found", 404);
  }
  return await ShoppingMallSystemSettingTransformer.transform(settings);
}
