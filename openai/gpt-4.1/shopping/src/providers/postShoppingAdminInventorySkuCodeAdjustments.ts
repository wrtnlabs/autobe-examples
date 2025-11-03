import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAdjustment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminInventorySkuCodeAdjustments(props: {
  admin: AdminPayload;
  skuCode: string;
  body: IShoppingInventoryAdjustment.ICreate;
}): Promise<IShoppingInventoryAdjustment> {
  const now = toISOStringSafe(new Date());
  // 1. Lookup SKU by code
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { sku_code: props.skuCode },
  });
  if (!sku || sku.deleted_at !== null) {
    throw new HttpException("SKU not found", 404);
  }
  // 2. Only admin is allowed (already enforced by route decor but double check for clarity)
  if (props.body.actor_type !== "admin" || props.admin.type !== "admin") {
    throw new HttpException(
      "Only admin may adjust inventory via this endpoint.",
      403,
    );
  }
  // 3. Lookup inventory row by sku_id
  const inventory = await MyGlobal.prisma.shopping_inventory.findUnique({
    where: { shopping_sku_id: sku.id },
  });
  if (!inventory || inventory.deleted_at !== null) {
    throw new HttpException("SKU inventory not found", 404);
  }
  const before = inventory.quantity;
  const adjustment = props.body.adjustment_amount;
  const after = before + adjustment;
  if (after < 0) {
    throw new HttpException(
      "Adjustment would result in negative inventory",
      400,
    );
  }
  // 4. Create adjustment record and update inventory atomically
  const id = v4();
  const [updatedInventory, adjustmentRecord] =
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.shopping_inventory.update({
        where: { id: inventory.id },
        data: { quantity: after, updated_at: now },
      }),
      MyGlobal.prisma.shopping_inventory_adjustments.create({
        data: {
          id,
          shopping_inventory_id: inventory.id,
          shopping_sku_id: sku.id,
          actor_type: "admin",
          actor_id: props.admin.id,
          reason_code: props.body.reason_code,
          quantity_before: before,
          quantity_after: after,
          adjustment_amount: adjustment,
          context_note: props.body.context_note ?? undefined,
          created_at: now,
        },
      }),
    ]);
  return {
    id: adjustmentRecord.id,
    shopping_inventory_id: adjustmentRecord.shopping_inventory_id,
    shopping_sku_id: adjustmentRecord.shopping_sku_id,
    actor_type: adjustmentRecord.actor_type,
    actor_id: adjustmentRecord.actor_id,
    reason_code: adjustmentRecord.reason_code,
    quantity_before: adjustmentRecord.quantity_before,
    quantity_after: adjustmentRecord.quantity_after,
    adjustment_amount: adjustmentRecord.adjustment_amount,
    context_note: adjustmentRecord.context_note ?? undefined,
    created_at: toISOStringSafe(adjustmentRecord.created_at),
  };
}
