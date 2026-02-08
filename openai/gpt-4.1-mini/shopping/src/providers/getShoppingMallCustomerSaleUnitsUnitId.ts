import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSaleUnitsUnitId(props: {
  customer: CustomerPayload;
  unitId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleUnit> {
  const record = await MyGlobal.prisma.shopping_mall_sale_units.findUnique({
    where: { id: props.unitId },
    select: {
      id: true,
      shopping_mall_sale_id: true,
      sku_code: true,
      option_values: true,
      price_override: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (record === null) {
    throw new HttpException("Sale unit not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_sale_id: record.shopping_mall_sale_id,
    sku_code: record.sku_code,
    option_values: record.option_values,
    price_override:
      record.price_override === null ? null : record.price_override,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
