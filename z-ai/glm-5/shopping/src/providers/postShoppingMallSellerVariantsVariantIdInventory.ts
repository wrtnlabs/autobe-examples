import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallInventoryRecordCollector } from "../collectors/ShoppingMallInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  // 1. Verify variant exists and belongs to the seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        product: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. For negative adjustments, validate stock won't go negative
  if (props.body.quantity_change < 0) {
    const currentStock =
      await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
        where: { variant_id: props.variantId },
        _sum: { quantity_change: true },
      });
    const stockQuantity = currentStock._sum.quantity_change ?? 0;
    const newStock = stockQuantity + props.body.quantity_change;
    if (newStock < 0) {
      throw new HttpException("Insufficient stock for this adjustment", 400);
    }
  }
  // 3. Create the inventory record using Collector
  const createInput = await ShoppingMallInventoryRecordCollector.collect({
    body: props.body,
    shoppingMallProductVariants: { id: props.variantId },
    shoppingMallSellers: { id: props.seller.id },
    shoppingMallSellerSessions: { id: props.seller.session_id },
  });
  const created = await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data: createInput,
    ...ShoppingMallInventoryRecordTransformer.select(),
  });
  // 4. Transform and return
  return await ShoppingMallInventoryRecordTransformer.transform(created);
}
