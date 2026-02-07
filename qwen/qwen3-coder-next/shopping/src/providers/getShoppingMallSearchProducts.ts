import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSearchProducts(): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = 1; // Default page
  const limit = 20; // Default limit
  const skip = (page - 1) * limit;
  // Build where conditions for search
  const whereConditions: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    status: "active",
  };
  // Find products matching search criteria with variants join for stock checking
  const data = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }], // Default sort by newest
    include: {
      variants: {
        where: {
          deleted_at: null,
          is_active: true,
          stock_quantity: { gt: 0 },
        },
        select: {
          id: true,
          stock_quantity: true,
        },
      },
    },
  });
  // Transform to response format
  const resultData: IShoppingMallProduct.ISummary[] = data.map((product) => ({
    id: product.id as string & tags.Format<"uuid">,
    name: product.name,
    price: product.base_price,
    status: product.status,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
  }));
  // Calculate total count
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereConditions,
  });
  return {
    data: resultData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
