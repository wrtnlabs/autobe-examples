import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSystemSettingsId(props: {
  id: string & tags.Format<"uuid">;
  body: IShoppingMallSystemSetting.IUpdate;
}): Promise<IShoppingMallSystemSetting> {
  const existing =
    await MyGlobal.prisma.shopping_mall_system_settings.findUnique({
      where: { id: props.id },
    });
  if (!existing) {
    throw new HttpException("System setting not found", 404);
  }
  // Since no update fields are defined, no update operation is done
  // Return an empty object matching the empty IShoppingMallSystemSetting type
  return {} as IShoppingMallSystemSetting;
}
