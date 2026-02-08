import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSystemSettingCollector } from "../collectors/ShoppingMallSystemSettingCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSystemSettings(props: {
  body: IShoppingMallSystemSetting.ICreate;
}): Promise<IShoppingMallSystemSetting> {
  try {
    const nowISO = toISOStringSafe(new Date());
    const data = await ShoppingMallSystemSettingCollector.collect({
      body: props.body,
    });
    const created = await MyGlobal.prisma.shopping_mall_system_settings.create({
      data: {
        ...data,
        created_at: nowISO,
        updated_at: nowISO,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      key: created.key,
      value: created.value,
      description: created.description === null ? null : created.description,
      data_type: created.data_type,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002" &&
      Array.isArray(e.meta?.target) &&
      e.meta.target.includes("key")
    ) {
      throw new HttpException("System setting key already exists", 400);
    }
    throw e;
  }
}
