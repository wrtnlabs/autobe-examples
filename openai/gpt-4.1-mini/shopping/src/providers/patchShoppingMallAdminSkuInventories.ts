import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";
import { IPageIShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuInventory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";
import { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSkuInventories(props: {
  admin: AdminPayload;
  body: IShoppingMallSkuInventory.IRequest;
}): Promise<IPageIShoppingMallSkuInventory.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build quantity filter carefully with both gte and lte if present
  const quantityFilter: { gte?: number; lte?: number } = {};
  if (body.min_quantity !== undefined && body.min_quantity !== null)
    quantityFilter.gte = body.min_quantity;
  if (body.max_quantity !== undefined && body.max_quantity !== null)
    quantityFilter.lte = body.max_quantity;

  const where: Prisma.shopping_mall_sku_inventoriesWhereInput = {
    deleted_at: null,
    ...(body.shopping_mall_product_sku_code !== undefined &&
      body.shopping_mall_product_sku_code !== null && {
        productSku: {
          sku_code: { contains: body.shopping_mall_product_sku_code },
        },
      }),
    ...(body.stock_status !== undefined &&
      body.stock_status !== null && { stock_status: body.stock_status }),
    ...(Object.keys(quantityFilter).length > 0 && { quantity: quantityFilter }),
    ...((body.date_from !== undefined && body.date_from !== null) ||
    (body.date_to !== undefined && body.date_to !== null)
      ? {
          updated_at: {
            ...(body.date_from !== undefined && body.date_from !== null
              ? { gte: body.date_from }
              : {}),
            ...(body.date_to !== undefined && body.date_to !== null
              ? { lte: body.date_to }
              : {}),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sku_inventories.findMany({
      where,
      include: {
        productSku: true,
      },
      orderBy: {
        [body.sort_by && body.sort_by.length > 0 ? body.sort_by : "updated_at"]:
          body.order === "asc" ? "asc" : "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sku_inventories.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((row) => ({
      id: row.id,
      shopping_mall_product_sku_id: row.shopping_mall_product_sku_id,
      quantity: row.quantity,
      stock_status: row.stock_status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null
          ? null
          : row.deleted_at !== undefined
            ? toISOStringSafe(row.deleted_at)
            : undefined,
      productSku: {
        id: row.productSku.id,
        sku_code: row.productSku.sku_code,
        price: row.productSku.price,
        attributes_json: row.productSku.attributes_json ?? null,
        created_at: toISOStringSafe(row.productSku.created_at),
        updated_at: toISOStringSafe(row.productSku.updated_at),
      },
    })),
  };
}
