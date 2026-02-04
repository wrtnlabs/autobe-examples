import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerInventoryRecordsInventoryId(props: {
  seller: SellerPayload;
  inventoryId: string;
}): Promise<IShoppingMallInventoryRecord> {
  const record =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUnique({
      where: { id: props.inventoryId },
      select: {
        id: true,
        variant_id: true,
        quantity_change: true,
        reason: true,
        source_type: true,
        source_id: true,
        created_at: true,
      },
    });
  if (!record) {
    throw new HttpException("Inventory record not found", 404);
  }
  // Verify seller owns the variant or has admin rights
  const variant = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: record.variant_id },
    select: { seller_id: true },
  });
  if (!variant || variant.seller_id !== props.seller.id) {
    // Check if seller is super admin (from context)
    const superAdmin =
      await MyGlobal.prisma.shopping_mall_super_admins.findUnique({
        where: { id: props.seller.id },
      });
    if (!superAdmin) {
      throw new HttpException("Unauthorized access to inventory record", 403);
    }
  }
  // Structure response to match IShoppingMallInventoryRecord
  return {
    totalQuantityChange: record.quantity_change,
    transactionCount: 1,
    averageChange: record.quantity_change,
  };
}
