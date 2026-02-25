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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSystemSettingTransformer } from "../transformers/ShoppingMallSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSystemSettings(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSystemSetting.ICreate;
}): Promise<IShoppingMallSystemSetting> {
  try {
    const now: string & tags.Format<"date-time"> =
      new Date().toISOString() as unknown as string & tags.Format<"date-time">;
    const dataForCreate = await ShoppingMallSystemSettingCollector.collect({
      body: props.body,
    });
    const record = await MyGlobal.prisma.shopping_mall_system_settings.upsert({
      where: { key: props.body.key },
      update: {
        value: props.body.value,
        description: props.body.description ?? null,
        data_type: props.body.data_type,
        updated_at: now,
      },
      create: {
        ...dataForCreate,
        created_at: now,
        updated_at: now,
      },
      ...ShoppingMallSystemSettingTransformer.select(),
    });
    return await ShoppingMallSystemSettingTransformer.transform(record);
  } catch (error) {
    throw new HttpException(
      `Failed to create or update system setting: ${String(error)}`,
      500,
    );
  }
}
