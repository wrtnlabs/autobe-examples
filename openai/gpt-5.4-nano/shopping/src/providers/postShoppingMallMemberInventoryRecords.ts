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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberInventoryRecords(props: {
  member: MemberPayload;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_product_variant_id },
      select: {
        id: true,
        is_active: true,
        deleted_at: true,
        product: {
          select: { shopping_mall_seller_id: true },
        },
      },
    });
  if (variant.deleted_at !== null || variant.is_active !== true) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.product.shopping_mall_seller_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const stockQuantity = props.body.stock_quantity;
  const reservedQuantity = props.body.reserved_quantity;
  const availableQuantity = props.body.available_quantity;
  const isNonNegativeInt = (v: number): boolean =>
    Number.isInteger(v) && v >= 0;
  if (
    !isNonNegativeInt(stockQuantity) ||
    !isNonNegativeInt(reservedQuantity) ||
    !isNonNegativeInt(availableQuantity)
  ) {
    throw new HttpException("Invalid quantities", 400);
  }
  if (availableQuantity !== stockQuantity - reservedQuantity) {
    throw new HttpException("Inconsistent inventory quantities", 400);
  }
  const nowIso = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    return tx.shopping_mall_inventory_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_variant_id:
          props.body.shopping_mall_product_variant_id,
        stock_quantity: stockQuantity,
        reserved_quantity: reservedQuantity,
        available_quantity: availableQuantity,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });
  });
  return {
    id: created.id,
    shopping_mall_product_variant_id: created.shopping_mall_product_variant_id,
    stock_quantity: created.stock_quantity,
    reserved_quantity: created.reserved_quantity,
    available_quantity: created.available_quantity,
    created_at:
      typeof created.created_at === "string"
        ? created.created_at
        : toISOStringSafe(created.created_at),
    updated_at:
      typeof created.updated_at === "string"
        ? created.updated_at
        : toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  } satisfies IShoppingMallInventoryRecord;
}
