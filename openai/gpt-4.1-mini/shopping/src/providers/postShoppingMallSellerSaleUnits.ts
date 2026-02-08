import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleUnitCollector } from "../collectors/ShoppingMallSaleUnitCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSaleUnits(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleUnit.ICreate;
}): Promise<IShoppingMallSaleUnit> {
  // Access shopping_mall_sale_id and sku_code cautiously
  const shopping_mall_sale_id = (props.body as any).shopping_mall_sale_id;
  const sku_code = (props.body as any).sku_code;
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: shopping_mall_sale_id },
  });
  if (sale === null) throw new HttpException("Sale not found", 404);
  const existingUnit =
    await MyGlobal.prisma.shopping_mall_sale_units.findUnique({
      where: {
        shopping_mall_sale_id_sku_code: {
          shopping_mall_sale_id: shopping_mall_sale_id,
          sku_code: sku_code,
        },
      },
    });
  if (existingUnit !== null)
    throw new HttpException("SKU code already exists in this sale", 409);
  const createInput = await ShoppingMallSaleUnitCollector.collect({
    body: props.body,
    sale: sale,
  });
  const created = await MyGlobal.prisma.shopping_mall_sale_units.create({
    data: createInput,
  });
  return {
    id: created.id,
    shopping_mall_sale_id: created.shopping_mall_sale_id,
    sku_code: created.sku_code,
    option_values: created.option_values,
    price_override: created.price_override ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at == null ? null : toISOStringSafe(created.deleted_at),
  };
}
