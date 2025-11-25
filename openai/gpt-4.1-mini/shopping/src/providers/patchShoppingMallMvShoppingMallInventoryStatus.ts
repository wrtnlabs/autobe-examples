import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMvShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMvShoppingMallInventoryStatus";
import { IPageIShoppingMallMvShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMvShoppingMallInventoryStatus";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallMvShoppingMallInventoryStatus(props: {
  body: IShoppingMallMvShoppingMallInventoryStatus.IRequest;
}): Promise<IPageIShoppingMallMvShoppingMallInventoryStatus.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;

  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }

  if (limit < 1) {
    throw new HttpException("Limit must be at least 1", 400);
  }

  const skip = (page - 1) * limit;

  const whereCondition: {
    category_id?: string & tags.Format<"uuid">;
    low_stock_sku_count?: { gt: number & tags.Type<"int32"> };
  } = {};

  if (props.body.filterCategoryId !== undefined) {
    whereCondition.category_id = props.body.filterCategoryId;
  }

  if (props.body.filterLowStockOnly === true) {
    whereCondition.low_stock_sku_count = { gt: 0 };
  }

  // Define known sortable fields to avoid runtime errors
  const knownSortableFields = new Set([
    "id",
    "category_id",
    "total_sku_count",
    "total_inventory_quantity",
    "low_stock_threshold",
    "low_stock_sku_count",
    "last_refreshed_at",
  ]);

  const orderByCondition: Record<string, "asc" | "desc"> = {};

  if (props.body.sortBy && knownSortableFields.has(props.body.sortBy)) {
    const order: "asc" | "desc" = props.body.sortOrder ?? "asc";
    orderByCondition[props.body.sortBy] = order;
  } else {
    orderByCondition.id = "asc";
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.mv_shopping_mall_inventory_status.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.mv_shopping_mall_inventory_status.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: records.map((item) => ({
      id: item.id,
      category_id: item.category_id,
      total_sku_count: item.total_sku_count,
      total_inventory_quantity: item.total_inventory_quantity,
      low_stock_threshold: item.low_stock_threshold,
      low_stock_sku_count: item.low_stock_sku_count,
      last_refreshed_at: toISOStringSafe(item.last_refreshed_at),
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
