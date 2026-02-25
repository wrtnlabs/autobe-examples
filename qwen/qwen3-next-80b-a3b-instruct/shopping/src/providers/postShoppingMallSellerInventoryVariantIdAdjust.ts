import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
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

export async function postShoppingMallSellerInventoryVariantIdAdjust(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallInventoryLog;
}): Promise<void> {
  // Validate change_quantity is non-zero (per DTO spec and business rule)
  if (props.body.change_quantity === 0) {
    throw new HttpException("change_quantity must be non-zero", 422);
  }
  // Validate reason is permitted on this endpoint (adjustment or loss only)
  if (props.body.reason !== "adjustment" && props.body.reason !== "loss") {
    throw new HttpException(
      'Invalid reason: must be "adjustment" or "loss"',
      400,
    );
  }
  // Validate variant exists and belongs to seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product: {
          seller_id: props.seller.id,
        },
      },
      select: { id: true, stock_quantity: true },
    });
  if (!variant) {
    throw new HttpException("Variant not found or not owned by seller", 404);
  }
  // Atomic transaction: log creation and stock update
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Generate unique ID and timestamp once for consistency
    const now = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    const logId = v4();
    // Create inventory log record with all required fields
    await prisma.shopping_mall_inventory_logs.create({
      data: {
        id: logId,
        variant_id: props.variantId,
        change_quantity: props.body.change_quantity,
        reason: props.body.reason,
        reference_id: props.body.reference_id,
        notes: props.body.notes,
        created_at: now,
        updated_at: now,
      },
    });
    // Atomically update stock quantity
    await prisma.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        stock_quantity: {
          increment: props.body.change_quantity,
        },
        updated_at: now,
      },
    });
  });
}
