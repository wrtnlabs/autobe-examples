import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAdjustment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingSellerInventorySkuCodeAdjustments(props: {
  seller: SellerPayload;
  skuCode: string;
  body: IShoppingInventoryAdjustment.ICreate;
}): Promise<IShoppingInventoryAdjustment> {
  // 1. Find the SKU
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      sku_code: props.skuCode,
      is_active: true,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  // 2. Get the parent product for SKU to determine seller ownership
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { id: sku.shopping_product_id },
    select: { id: true, shopping_seller_id: true },
  });
  if (!product || product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("You are not authorized to adjust this SKU", 403);
  }

  // 3. Get or create inventory record
  let inventory = await MyGlobal.prisma.shopping_inventory.findFirst({
    where: {
      shopping_sku_id: sku.id,
      deleted_at: null,
    },
  });

  let quantity_before = 0;
  let quantity_after = 0;

  if (!inventory) {
    // No inventory record: only allow positive adjustment as first record
    if (props.body.adjustment_amount < 0) {
      throw new HttpException(
        "Cannot create negative inventory for new SKU. First adjustment must increase stock.",
        400,
      );
    }
    const nowStr = toISOStringSafe(new Date());
    inventory = await MyGlobal.prisma.shopping_inventory.create({
      data: {
        id: v4(),
        shopping_sku_id: sku.id,
        quantity: props.body.adjustment_amount,
        created_at: nowStr,
        updated_at: nowStr,
      },
    });
    quantity_before = 0;
    quantity_after = props.body.adjustment_amount;
  } else {
    quantity_before = inventory.quantity;
    quantity_after = inventory.quantity + props.body.adjustment_amount;
    if (quantity_after < 0) {
      throw new HttpException(
        "Inventory cannot be negative after adjustment.",
        400,
      );
    }
    await MyGlobal.prisma.shopping_inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: quantity_after,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }

  // 4. Prepare and create the inventory adjustment record
  const now = toISOStringSafe(new Date());
  const adjustment =
    await MyGlobal.prisma.shopping_inventory_adjustments.create({
      data: {
        id: v4(),
        shopping_inventory_id: inventory.id,
        shopping_sku_id: sku.id,
        actor_type: props.body.actor_type,
        actor_id: props.seller.id,
        reason_code: props.body.reason_code,
        quantity_before: quantity_before,
        quantity_after: quantity_after,
        adjustment_amount: props.body.adjustment_amount,
        context_note: props.body.context_note ?? null,
        created_at: now,
      },
    });

  return {
    id: adjustment.id,
    shopping_inventory_id: adjustment.shopping_inventory_id,
    shopping_sku_id: adjustment.shopping_sku_id,
    actor_type: adjustment.actor_type,
    actor_id: adjustment.actor_id,
    reason_code: adjustment.reason_code,
    quantity_before: adjustment.quantity_before,
    quantity_after: adjustment.quantity_after,
    adjustment_amount: adjustment.adjustment_amount,
    context_note: adjustment.context_note ?? null,
    created_at: toISOStringSafe(adjustment.created_at),
  };
}
