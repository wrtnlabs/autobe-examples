import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberInventoryRecordsInventoryRecordId(props: {
  member: MemberPayload;
  inventoryRecordId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IUpdate;
}): Promise<IShoppingMallInventoryRecord> {
  const member = await MyGlobal.prisma.shopping_mall_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (member === null) {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.inventoryRecordId },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        stock_quantity: true,
        reserved_quantity: true,
        available_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (existing.deleted_at !== null) {
    throw new HttpException("Gone", 410);
  }
  const nextDeletedAt: (string & tags.Format<"date-time">) | null =
    props.body.deleted_at === undefined
      ? existing.deleted_at
      : props.body.deleted_at;
  const nextStockQuantity: number =
    props.body.stock_quantity === undefined
      ? existing.stock_quantity
      : props.body.stock_quantity;
  const nextReservedQuantity: number =
    props.body.reserved_quantity === undefined
      ? existing.reserved_quantity
      : props.body.reserved_quantity;
  const nextAvailableQuantity: number =
    props.body.available_quantity === undefined
      ? existing.available_quantity
      : props.body.available_quantity;
  const nextUpdatedAt: string & tags.Format<"date-time"> =
    props.body.updated_at === undefined
      ? existing.updated_at.toISOString()
      : props.body.updated_at;
  const isValidIntNonNegative = (v: number) => Number.isInteger(v) && v >= 0;
  if (
    !isValidIntNonNegative(nextStockQuantity) ||
    !isValidIntNonNegative(nextReservedQuantity) ||
    !isValidIntNonNegative(nextAvailableQuantity)
  ) {
    throw new HttpException("Invalid quantities", 400);
  }
  if (nextReservedQuantity > nextStockQuantity) {
    throw new HttpException("Reserved quantity exceeds stock", 400);
  }
  const expectedAvailable = nextStockQuantity - nextReservedQuantity;
  if (nextAvailableQuantity !== expectedAvailable) {
    throw new HttpException("Inventory inconsistency", 400);
  }
  const variantId = existing.shopping_mall_product_variant_id;
  const activeRecords =
    await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: {
        shopping_mall_product_variant_id: variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        stock_quantity: true,
        reserved_quantity: true,
        available_quantity: true,
      },
    });
  const replacedRecords = activeRecords.map((r) => {
    if (r.id !== existing.id) return r;
    return {
      id: r.id,
      stock_quantity: nextStockQuantity,
      reserved_quantity: nextReservedQuantity,
      available_quantity: nextAvailableQuantity,
    };
  });
  const resultingActive =
    nextDeletedAt === null
      ? replacedRecords
      : replacedRecords.filter((r) => r.id !== existing.id);
  const totalStock = resultingActive.reduce(
    (sum, r) => sum + r.stock_quantity,
    0,
  );
  const totalReserved = resultingActive.reduce(
    (sum, r) => sum + r.reserved_quantity,
    0,
  );
  const totalAvailable = resultingActive.reduce(
    (sum, r) => sum + r.available_quantity,
    0,
  );
  if (
    !isValidIntNonNegative(totalStock) ||
    !isValidIntNonNegative(totalReserved) ||
    !isValidIntNonNegative(totalAvailable)
  ) {
    throw new HttpException("Invalid inventory totals", 400);
  }
  if (totalReserved > totalStock) {
    throw new HttpException("Inventory inconsistency", 400);
  }
  if (totalAvailable !== totalStock - totalReserved) {
    throw new HttpException("Inventory inconsistency", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_inventory_records.update({
      where: { id: existing.id },
      data: {
        ...(props.body.stock_quantity !== undefined && {
          stock_quantity: nextStockQuantity,
        }),
        ...(props.body.reserved_quantity !== undefined && {
          reserved_quantity: nextReservedQuantity,
        }),
        ...(props.body.available_quantity !== undefined && {
          available_quantity: nextAvailableQuantity,
        }),
        ...(props.body.updated_at !== undefined && {
          updated_at: nextUpdatedAt,
        }),
        ...(props.body.deleted_at !== undefined && {
          deleted_at: nextDeletedAt,
        }),
      },
    });
    return tx.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: existing.id },
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  });
  const refreshed =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: existing.id },
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  return await ShoppingMallInventoryRecordTransformer.transform(refreshed);
}
