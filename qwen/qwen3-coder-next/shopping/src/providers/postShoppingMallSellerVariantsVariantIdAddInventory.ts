import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function postShoppingMallSellerVariantsVariantIdAddInventory(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallProductVariant.IRestock;
}): Promise<void> {
  // Validate variant ownership
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { shopping_mall_product_id: true },
    });
  // Verify seller owns the product
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: variant.shopping_mall_product_id },
      select: { shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate quantity is positive
  if (props.body.quantity <= 0) {
    throw new HttpException("Quantity must be positive", 400);
  }
  // Create inventory history record
  await MyGlobal.prisma.shopping_mall_inventory_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_variant_id: props.variantId,
      shopping_mall_seller_id: props.seller.id,
      quantity_change: props.body.quantity,
      reason: props.body.reason,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // Update stock quantity by summing inventory history
  const result = await MyGlobal.prisma.$queryRawUnsafe<
    Array<{
      current_stock: number;
    }>
  >(
    "SELECT COALESCE(SUM(quantity_change), 0) as current_stock FROM shopping_mall_inventory_histories WHERE shopping_mall_product_variant_id = $1",
    [props.variantId],
  );
  const currentStock = result[0]?.current_stock ?? 0;
  // Update variant stock quantity
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      stock_quantity: currentStock,
    },
  });
  // Update or create variant stocks record
  await MyGlobal.prisma.shopping_mall_variant_stocks.upsert({
    where: { product_variant_id: props.variantId },
    create: {
      id: v4() as string & tags.Format<"uuid">,
      product_variant_id: props.variantId,
      current_quantity: currentStock,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
    update: {
      current_quantity: currentStock,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
}
