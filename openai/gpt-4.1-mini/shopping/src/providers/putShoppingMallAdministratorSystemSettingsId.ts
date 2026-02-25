import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSystemSettingTransformer } from "../transformers/ShoppingMallSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorSystemSettingsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallSystemSetting.IUpdate;
}): Promise<IShoppingMallSystemSetting> {
  const updated = await MyGlobal.prisma.shopping_mall_system_settings.update({
    where: { id: props.id },
    data: {
      key: props.body.key,
      value: props.body.value,
      description: props.body.description ?? null,
      data_type: props.body.data_type,
    },
  });
  return await ShoppingMallSystemSettingTransformer.transform(updated);
}
