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

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  // Use default pagination values since IRequest has no properties
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
  };
  // Build order by conditions
  const orderByConditions: Prisma.shopping_mall_productsOrderByWithRelationInput[] =
    [{ created_at: "desc" }];
  // Get count for pagination
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereConditions,
  });
  // Fetch products
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: orderByConditions,
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      status: true,
      created_at: true,
      updated_at: true,
      variants: {
        where: {
          is_active: true,
          stock_quantity: { gt: 0 },
        },
        select: {
          stock_quantity: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          name: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  return {
    data: products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      status: product.status,
      created_at: toISOStringSafe(product.created_at),
      updated_at: toISOStringSafe(product.updated_at),
      subcategory_id: product.subcategory?.id,
      subcategory_name: product.subcategory?.name,
      category_id: product.subcategory?.category?.id,
      category_name: product.subcategory?.category?.name,
      total_stock: product.variants.reduce(
        (sum, v) => sum + v.stock_quantity,
        0,
      ),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
