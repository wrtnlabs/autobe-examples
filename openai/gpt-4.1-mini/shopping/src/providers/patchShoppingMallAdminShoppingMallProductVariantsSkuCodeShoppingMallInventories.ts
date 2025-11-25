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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallProductVariantsSkuCodeShoppingMallInventories(props: {
  admin: AdminPayload;
  skuCode: string;
  body: IShoppingMallInventory.IRequest;
}): Promise<IPageIShoppingMallInventory.ISummary> {
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { sku_code: props.skuCode },
    });

  if (!productVariant) {
    throw new HttpException("Product variant SKU not found", 404);
  }

  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const whereClause = {
    shopping_mall_product_variant_id: productVariant.id,
    deleted_at: null as null,
    ...(props.body.quantity_min !== undefined &&
      props.body.quantity_min !== null && {
        quantity: { gte: props.body.quantity_min },
      }),
    ...(props.body.quantity_max !== undefined &&
      props.body.quantity_max !== null && {
        quantity: { lte: props.body.quantity_max },
      }),
    ...(props.body.reserved_quantity_min !== undefined &&
      props.body.reserved_quantity_min !== null && {
        reserved_quantity: { gte: props.body.reserved_quantity_min },
      }),
    ...(props.body.reserved_quantity_max !== undefined &&
      props.body.reserved_quantity_max !== null && {
        reserved_quantity: { lte: props.body.reserved_quantity_max },
      }),
    ...(props.body.restock_date_from !== undefined &&
      props.body.restock_date_from !== null && {
        restock_date: { gte: props.body.restock_date_from },
      }),
    ...(props.body.restock_date_to !== undefined &&
      props.body.restock_date_to !== null && {
        restock_date: { lte: props.body.restock_date_to },
      }),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventories.findMany({
      where: whereClause,
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
    MyGlobal.prisma.shopping_mall_inventories.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      shopping_mall_product_variant_id: record.shopping_mall_product_variant_id,
      quantity: record.quantity,
      reserved_quantity: record.reserved_quantity,
    })),
  };
}
