import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import { IPageIShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerShoppingMallProductVariantsSkuCodeShoppingMallInventories(props: {
  seller: SellerPayload;
  skuCode: string;
  body: IShoppingMallInventory.IRequest;
}): Promise<IPageIShoppingMallInventory.ISummary> {
  // Find the product variant by SKU code, ignoring soft deleted
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        sku_code: props.skuCode,
        deleted_at: null,
      },
      select: { id: true },
    });

  if (!productVariant) {
    throw new HttpException(`SKU code ${props.skuCode} not found`, 404);
  }

  const whereConditions = {
    shopping_mall_product_variant_id: productVariant.id,
    deleted_at: null,
    ...(props.body.quantity_min !== null &&
      props.body.quantity_min !== undefined && {
        quantity: { gte: props.body.quantity_min },
      }),
    ...(props.body.quantity_max !== null &&
      props.body.quantity_max !== undefined && {
        quantity: { lte: props.body.quantity_max },
      }),
    ...(props.body.reserved_quantity_min !== null &&
      props.body.reserved_quantity_min !== undefined && {
        reserved_quantity: { gte: props.body.reserved_quantity_min },
      }),
    ...(props.body.reserved_quantity_max !== null &&
      props.body.reserved_quantity_max !== undefined && {
        reserved_quantity: { lte: props.body.reserved_quantity_max },
      }),
    ...(props.body.restock_date_from !== null &&
      props.body.restock_date_from !== undefined && {
        restock_date: { gte: props.body.restock_date_from },
      }),
    ...(props.body.restock_date_to !== null &&
      props.body.restock_date_to !== undefined && {
        restock_date: { lte: props.body.restock_date_to },
      }),
  };

  // Because multiple conditions on same field overwriting previous, merge for quantity and reserved_quantity
  const quantityWhere: Record<string, unknown> = {};
  if (props.body.quantity_min !== null && props.body.quantity_min !== undefined)
    quantityWhere.gte = props.body.quantity_min;
  if (props.body.quantity_max !== null && props.body.quantity_max !== undefined)
    quantityWhere.lte = props.body.quantity_max;
  const reservedQuantityWhere: Record<string, unknown> = {};
  if (
    props.body.reserved_quantity_min !== null &&
    props.body.reserved_quantity_min !== undefined
  )
    reservedQuantityWhere.gte = props.body.reserved_quantity_min;
  if (
    props.body.reserved_quantity_max !== null &&
    props.body.reserved_quantity_max !== undefined
  )
    reservedQuantityWhere.lte = props.body.reserved_quantity_max;

  // Merged where conditions
  const mergedWhere = {
    shopping_mall_product_variant_id: productVariant.id,
    deleted_at: null,
    ...(Object.keys(quantityWhere).length > 0
      ? { quantity: quantityWhere }
      : {}),
    ...(Object.keys(reservedQuantityWhere).length > 0
      ? { reserved_quantity: reservedQuantityWhere }
      : {}),
    ...(props.body.restock_date_from !== null &&
    props.body.restock_date_from !== undefined
      ? { restock_date: { gte: props.body.restock_date_from } }
      : {}),
    ...(props.body.restock_date_to !== null &&
    props.body.restock_date_to !== undefined
      ? { restock_date: { lte: props.body.restock_date_to } }
      : {}),
  };

  // Pagination calculations
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 10;
  const skip = (page - 1) * limit;

  // Query data and count in parallel
  const [records, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventories.findMany({
      where: mergedWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        reserved_quantity: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_inventories.count({ where: mergedWhere }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data: records.map((rec) => ({
      id: rec.id,
      shopping_mall_product_variant_id: rec.shopping_mall_product_variant_id,
      quantity: rec.quantity,
      reserved_quantity: rec.reserved_quantity,
    })),
  };
}
