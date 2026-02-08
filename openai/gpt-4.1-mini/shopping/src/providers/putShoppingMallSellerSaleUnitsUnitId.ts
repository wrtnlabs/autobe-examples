import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSaleUnitsUnitId(props: {
  seller: SellerPayload;
  unitId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleUnit.IUpdate;
}): Promise<IShoppingMallSaleUnit> {
  const unit = await MyGlobal.prisma.shopping_mall_sale_units.findUnique({
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
  if (!unit || unit.deleted_at !== null) {
    throw new HttpException("Sale unit not found", 404);
  }
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: unit.shopping_mall_sale_id },
    select: { seller_id: true },
  });
  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if ("sku_code" in props.body && typeof props.body.sku_code === "string") {
    const existingUnit =
      await MyGlobal.prisma.shopping_mall_sale_units.findFirst({
        where: {
          shopping_mall_sale_id: unit.shopping_mall_sale_id,
          sku_code: props.body.sku_code,
          id: { not: props.unitId },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingUnit) {
      throw new HttpException("SKU code conflict", 409);
    }
  }
  if (
    "option_values" in props.body &&
    typeof props.body.option_values === "string"
  ) {
    try {
      JSON.parse(props.body.option_values);
    } catch {
      throw new HttpException("Invalid optionValues JSON", 400);
    }
  }
  const updated = await MyGlobal.prisma.shopping_mall_sale_units.update({
    where: { id: props.unitId },
    data: {
      ...("sku_code" in props.body && typeof props.body.sku_code === "string"
        ? { sku_code: props.body.sku_code }
        : {}),
      ...("option_values" in props.body &&
      typeof props.body.option_values === "string"
        ? { option_values: props.body.option_values }
        : {}),
      price_override:
        "price_override" in props.body &&
        props.body.price_override !== undefined
          ? props.body.price_override
          : null,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    shopping_mall_sale_id: updated.shopping_mall_sale_id,
    sku_code: updated.sku_code,
    option_values: updated.option_values,
    price_override: updated.price_override ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
