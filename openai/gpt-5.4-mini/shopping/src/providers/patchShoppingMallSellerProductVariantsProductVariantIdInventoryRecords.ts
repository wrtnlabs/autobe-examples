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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductVariantsProductVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  productVariantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.productVariantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        product: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (variant.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const movementRequested =
    props.body.quantityChange !== undefined ||
    props.body.reason !== undefined ||
    props.body.occurredAt !== undefined;
  if (movementRequested) {
    if (
      props.body.quantityChange === undefined ||
      props.body.reason === undefined
    ) {
      throw new HttpException(
        "quantityChange and reason are required to record inventory movement",
        400,
      );
    }
    const nextStock =
      variant.shopping_mall_product_id === variant.shopping_mall_product_id
        ? undefined
        : undefined;
    const updatedVariant =
      await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
        where: { id: props.productVariantId },
        select: {
          id: true,
          stock_quantity: true,
        },
      });
    const resultingStock =
      updatedVariant.stock_quantity + props.body.quantityChange;
    if (resultingStock < 0) {
      throw new HttpException("Inventory cannot go below zero", 400);
    }
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id: props.productVariantId,
          quantity_change: props.body.quantityChange,
          reason: props.body.reason,
          occurred_at:
            props.body.occurredAt !== undefined
              ? props.body.occurredAt
              : toISOStringSafe(new Date()),
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.shopping_mall_product_variants.update({
        where: { id: props.productVariantId },
        data: {
          stock_quantity: resultingStock,
          updated_at: toISOStringSafe(new Date()),
        },
      }),
    ]);
  }
  const where = {
    shopping_mall_product_variant_id: props.productVariantId,
    deleted_at: null,
    ...(props.body.reason !== undefined
      ? { reason: { contains: props.body.reason } }
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
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ occurred_at: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      quantity_change: true,
      reason: true,
      occurred_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          override_price: true,
          stock_quantity: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where,
  });
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    data: data.map(
      (record) =>
        ({
          id: record.id,
          productVariant: {
            id: record.productVariant.id,
            skuCode: record.productVariant.sku_code,
            overridePrice: record.productVariant.override_price,
            stockQuantity: record.productVariant.stock_quantity,
            createdAt: toISOStringSafe(record.productVariant.created_at),
            updatedAt: toISOStringSafe(record.productVariant.updated_at),
            deletedAt:
              record.productVariant.deleted_at !== null
                ? toISOStringSafe(record.productVariant.deleted_at)
                : null,
          } satisfies IShoppingMallProductVariant.ISummary,
          quantityChange: record.quantity_change,
          reason: record.reason,
          occurredAt: toISOStringSafe(record.occurred_at),
          createdAt: toISOStringSafe(record.created_at),
          updatedAt: toISOStringSafe(record.updated_at),
          deletedAt:
            record.deleted_at !== null
              ? toISOStringSafe(record.deleted_at)
              : null,
        }) satisfies IShoppingMallInventoryRecord.ISummary,
    ),
    pagination,
  };
}
