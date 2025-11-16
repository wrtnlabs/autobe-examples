import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { IPageIShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallSkuOptions(props: {
  body: IShoppingMallSkuOption.IRequest;
}): Promise<IPageIShoppingMallSkuOption.ISummary> {
  const {
    page = 1,
    limit = 100,
    search,
    code,
    minPriceAdjustment,
    maxPriceAdjustment,
    sortBy,
    sortOrder = "asc",
    includeDeleted = false,
    exactMatch = false,
    categoryCode,
  } = props.body;

  const skip = (page - 1) * limit;

  const where = {
    ...(includeDeleted ? {} : { deleted_at: null }),
    ...(code ? { code: code } : {}),
    ...(minPriceAdjustment !== undefined
      ? { price_adjustment: { gte: minPriceAdjustment } }
      : {}),
    ...(maxPriceAdjustment !== undefined
      ? { price_adjustment: { lte: maxPriceAdjustment } }
      : {}),
    ...(search
      ? exactMatch
        ? { name: search }
        : { name: { contains: search } }
      : {}),
    ...(categoryCode ? { category_code: categoryCode } : {}),
  };

  const orderKey: string | undefined =
    sortBy === "createdAt"
      ? "created_at"
      : sortBy === "updatedAt"
        ? "updated_at"
        : sortBy === "priceAdjustment"
          ? "price_adjustment"
          : sortBy || undefined;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sku_options.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderKey
        ? {
            [orderKey]: sortOrder,
          }
        : undefined,
    }),
    MyGlobal.prisma.shopping_mall_sku_options.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      name: item.name,
      type: "summary",
    })),
  };
}
