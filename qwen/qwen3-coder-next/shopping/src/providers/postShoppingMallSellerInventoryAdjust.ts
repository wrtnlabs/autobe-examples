import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
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

export async function postShoppingMallSellerInventoryAdjust(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryHistory.ICreate;
}): Promise<void> {
  // Validate inventory adjustment reason
  const validReasons = ["restock", "adjustment", "loss", "correction"];
  if (!validReasons.includes(props.body.reason)) {
    throw new HttpException("Invalid inventory adjustment reason", 400);
  }
  // Check if product variant exists
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.variant_id },
      select: { shopping_mall_product_id: true, stock_quantity: true },
    });
  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }
  // For sellers, verify they own the product variant
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: variant.shopping_mall_product_id },
    select: { shopping_mall_seller_id: true },
  });
  if (product && product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("You do not have access to this product", 403);
  }
  // Create inventory history record
  const inventoryHistory =
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_variant_id: props.body.variant_id,
        shopping_mall_seller_id: props.seller.id,
        quantity_change: props.body.quantity_change,
        reason: props.body.reason,
        created_at: new Date(),
        metadata: props.body.metadata ?? null,
      },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        shopping_mall_seller_id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        metadata: true,
      },
    });
  // Update current stock quantity in shopping_mall_variant_stocks
  await MyGlobal.prisma.shopping_mall_variant_stocks.upsert({
    where: { product_variant_id: props.body.variant_id },
    create: {
      id: v4() as string & tags.Format<"uuid">,
      product_variant_id: props.body.variant_id,
      current_quantity: props.body.quantity_change,
      created_at: inventoryHistory.created_at,
      updated_at: inventoryHistory.created_at,
    },
    update: {
      current_quantity: {
        increment: props.body.quantity_change,
      },
      updated_at: inventoryHistory.created_at,
    },
  });
}
