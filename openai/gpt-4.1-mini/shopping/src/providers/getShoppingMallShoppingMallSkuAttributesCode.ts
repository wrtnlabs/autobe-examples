import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttribute";
import { IShoppingMallSkuAttributeConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeConfigurations";

export async function getShoppingMallShoppingMallSkuAttributesCode(props: {
  code: string;
}): Promise<IShoppingMallSkuAttribute> {
  const record = await MyGlobal.prisma.shopping_mall_sku_attributes.findUnique({
    where: { code: props.code },
  });

  if (!record) {
    throw new HttpException("ShoppingMallSkuAttribute not found", 404);
  }

  return {
    id: record.id,
    code: record.code,
    name: record.name,
    type: "default" satisfies string,
    configuration: {} as IShoppingMallSkuAttributeConfigurations,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
