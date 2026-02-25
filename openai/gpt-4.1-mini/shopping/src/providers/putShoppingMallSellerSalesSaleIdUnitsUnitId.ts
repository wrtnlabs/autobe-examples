import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleUnitTransformer } from "../transformers/ShoppingMallSaleUnitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSalesSaleIdUnitsUnitId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleUnit.IUpdate;
}): Promise<IShoppingMallSaleUnit> {
  const { seller, saleId, unitId, body } = props;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const unit = await tx.shopping_mall_sale_units.findUniqueOrThrow({
      where: { id: unitId },
      include: { sale: true },
    });
    if (unit.shopping_mall_sale_id !== saleId) {
      throw new HttpException("Sale unit not found for the given sale.", 404);
    }
    if (unit.sale.seller_id !== seller.id) {
      throw new HttpException("Forbidden: seller does not own the sale.", 403);
    }
    if (body.skuCode !== undefined && body.skuCode !== unit.sku_code) {
      const existingSku = await tx.shopping_mall_sale_units.findUnique({
        where: {
          shopping_mall_sale_id_sku_code: {
            shopping_mall_sale_id: saleId,
            sku_code: body.skuCode,
          },
        },
        select: { id: true },
      });
      if (existingSku) {
        throw new HttpException("SKU code already exists for this sale.", 400);
      }
    }
    await tx.shopping_mall_sale_units.update({
      where: { id: unitId },
      data: {
        ...(body.skuCode !== undefined && { sku_code: body.skuCode }),
        ...(body.optionValues !== undefined && {
          option_values: body.optionValues,
        }),
        ...(body.priceOverride !== undefined && {
          price_override: body.priceOverride,
        }),
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
    const updatedUnit = await tx.shopping_mall_sale_units.findUniqueOrThrow({
      where: { id: unitId },
      ...ShoppingMallSaleUnitTransformer.select(),
    });
    return await ShoppingMallSaleUnitTransformer.transform(updatedUnit);
  });
}
