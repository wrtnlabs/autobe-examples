import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductVariantsProductVariantIdInventoryRecords(props: {
  administrator: AdministratorPayload;
  productVariantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  await MyGlobal.prisma.shopping_mall_administrators.findFirstOrThrow({
    where: { id: props.administrator.id, deleted_at: null },
    select: { id: true },
  });
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.productVariantId },
    select: { id: true },
  });
  const quantityChange = props.body.quantityChange;
  const reason = props.body.reason;
  const occurredAt = props.body.occurredAt;
  const hasMovement: boolean =
    quantityChange !== undefined ||
    reason !== undefined ||
    occurredAt !== undefined;
  if (hasMovement) {
    if (quantityChange === undefined)
      throw new HttpException("quantityChange is required", 400);
    if (reason === undefined)
      throw new HttpException("reason is required", 400);
    if (reason.length === 0) throw new HttpException("reason is required", 400);
    if (occurredAt === undefined)
      throw new HttpException(
        "occurredAt is required for movement recording",
        400,
      );
    await MyGlobal.prisma.$transaction(async (tx) => {
      const variant = await tx.shopping_mall_product_variants.findUniqueOrThrow(
        {
          where: { id: props.productVariantId },
          select: { id: true, stock_quantity: true },
        },
      );
      const nextStockQuantity: number = variant.stock_quantity + quantityChange;
      if (nextStockQuantity < 0)
        throw new HttpException("Stock quantity cannot be negative", 400);
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id: props.productVariantId,
          quantity_change: quantityChange,
          reason,
          occurred_at: occurredAt,
          created_at: occurredAt,
          updated_at: occurredAt,
          deleted_at: null,
        },
      });
      await tx.shopping_mall_product_variants.update({
        where: { id: props.productVariantId },
        data: { stock_quantity: nextStockQuantity },
      });
    });
  }
  const where: Prisma.shopping_mall_inventory_recordsWhereInput = {
    shopping_mall_product_variant_id: props.productVariantId,
    deleted_at: null,
    ...(reason !== undefined && reason.length > 0
      ? { reason: { contains: reason } }
      : {}),
    ...(props.body.occurredAtFrom !== undefined ||
    props.body.occurredAtTo !== undefined
      ? {
          occurred_at: {
            ...(props.body.occurredAtFrom !== undefined
              ? { gte: props.body.occurredAtFrom }
              : {}),
            ...(props.body.occurredAtTo !== undefined
              ? { lte: props.body.occurredAtTo }
              : {}),
          },
        }
      : {}),
  };
  const records =
    await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ occurred_at: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity_change: true,
        reason: true,
        occurred_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where,
  });
  const variants = await Promise.all(
    records.map((record) =>
      MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
        where: { id: record.shopping_mall_product_variant_id },
        select: {
          id: true,
          sku_code: true,
          override_price: true,
          stock_quantity: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      }),
    ),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map(
      (record, index): IShoppingMallInventoryRecord.ISummary => ({
        id: record.id,
        productVariant: {
          id: variants[index].id,
          skuCode: variants[index].sku_code,
          overridePrice: variants[index].override_price,
          stockQuantity: variants[index].stock_quantity,
          createdAt: toISOStringSafe(variants[index].created_at),
          updatedAt: toISOStringSafe(variants[index].updated_at),
          deletedAt:
            variants[index].deleted_at === null
              ? null
              : toISOStringSafe(variants[index].deleted_at),
        },
        quantityChange: record.quantity_change,
        reason: record.reason,
        occurredAt: toISOStringSafe(record.occurred_at),
        createdAt: toISOStringSafe(record.created_at),
        updatedAt: toISOStringSafe(record.updated_at),
        deletedAt:
          record.deleted_at === null
            ? null
            : toISOStringSafe(record.deleted_at),
      }),
    ),
  };
}
