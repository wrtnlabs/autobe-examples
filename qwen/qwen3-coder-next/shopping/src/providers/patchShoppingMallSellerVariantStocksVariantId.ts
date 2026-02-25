import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantStocks } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantStocks";
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

export async function patchShoppingMallSellerVariantStocksVariantId(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallVariantStocks.IAdjustment;
}): Promise<void> {
  // 1. Validate variant exists and belongs to seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found or access denied", 404);
  }
  // 2. Calculate new stock quantity
  const newStockQuantity = variant.stock_quantity + props.body.quantity;
  // 3. Validate stock won't go negative
  if (newStockQuantity < 0) {
    throw new HttpException("Insufficient stock for this adjustment", 400);
  }
  // 4. Get current timestamp as string format
  const now = new Date();
  const nowString = toISOStringSafe(now);
  // 5. Create inventory history record
  await MyGlobal.prisma.shopping_mall_inventory_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_variant_id: props.variantId,
      shopping_mall_seller_id: props.seller.id,
      quantity_change: props.body.quantity,
      reason: props.body.reason,
      created_at: nowString,
    },
  });
  // 6. Update variant's current stock quantity
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      stock_quantity: newStockQuantity,
    },
  });
  // 7. Update variant stock summary
  await MyGlobal.prisma.shopping_mall_variant_stocks.upsert({
    where: { product_variant_id: props.variantId },
    update: {
      current_quantity: newStockQuantity,
      updated_at: nowString,
    },
    create: {
      id: v4() as string & tags.Format<"uuid">,
      product_variant_id: props.variantId,
      current_quantity: newStockQuantity,
      created_at: nowString,
      updated_at: nowString,
    },
  });
}
