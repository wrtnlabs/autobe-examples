import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerSettingTransformer } from "../transformers/ShoppingMallSellerSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellersSellerIdSettings(props: {
  sellerId: string;
}): Promise<IShoppingMallSellerSetting> {
  const settings =
    await MyGlobal.prisma.shopping_mall_seller_settings.findUnique({
      where: { shopping_mall_seller_id: props.sellerId },
      ...ShoppingMallSellerSettingTransformer.select(),
    });
  if (!settings) {
    throw new HttpException("Settings not found", 404);
  }
  return await ShoppingMallSellerSettingTransformer.transform(settings);
}
