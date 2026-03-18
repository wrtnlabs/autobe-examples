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
  const existing =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.inventoryRecordId },
      select: ShoppingMallInventoryRecordTransformer.select().select,
    });
  if (existing.deleted_at !== null) throw new HttpException("Gone", 410);
  const nextStockQuantity =
    props.body.stock_quantity ?? existing.stock_quantity;
  const nextReservedQuantity =
    props.body.reserved_quantity ?? existing.reserved_quantity;
  const nextAvailableQuantity =
    props.body.available_quantity ?? existing.available_quantity;
  if (
    nextStockQuantity < 0 ||
    nextReservedQuantity < 0 ||
    nextAvailableQuantity < 0
  )
    throw new HttpException("Invalid inventory quantities", 400);
  const toUpdate: Prisma.shopping_mall_inventory_recordsUpdateInput = {
    ...(props.body.stock_quantity !== undefined && {
      stock_quantity: props.body.stock_quantity,
    }),
    ...(props.body.reserved_quantity !== undefined && {
      reserved_quantity: props.body.reserved_quantity,
    }),
    ...(props.body.available_quantity !== undefined && {
      available_quantity: props.body.available_quantity,
    }),
    ...(props.body.updated_at !== undefined && {
      updated_at: new Date(props.body.updated_at),
    }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at:
        props.body.deleted_at === null ? null : new Date(props.body.deleted_at),
    }),
  };
  await MyGlobal.prisma.$transaction(async (tx) => {
    const affected = await tx.shopping_mall_inventory_records.findMany({
      where: {
        shopping_mall_product_variant_id:
          existing.shopping_mall_product_variant_id,
        deleted_at: null,
      },
      select: { id: true, stock_quantity: true },
    });
    const computedStock = affected.reduce(
      (sum, r) =>
        sum + (r.id === existing.id ? nextStockQuantity : r.stock_quantity),
      0,
    );
    if (computedStock < 0)
      throw new HttpException("Inventory inconsistency", 400);
    await tx.shopping_mall_inventory_records.update({
      where: { id: props.inventoryRecordId },
      data: toUpdate,
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.inventoryRecordId },
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  return await ShoppingMallInventoryRecordTransformer.transform(updated);
}
