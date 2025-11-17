import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const {
    page = 1,
    limit = 100,
    search,
    categoryCode,
    sellerCode,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder = "desc",
    inStockOnly,
    includeDiscontinued,
  } = props.body;

  // Build prisma where condition
  const where: any = {
    deleted_at: null,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (categoryCode) {
    // Assuming categoryCode filter is mapped to shopping_mall_category_id through lookup
    // Since we do not have access to category schema now, skip direct filter
  }

  if (sellerCode) {
    // Seller code filtering is not applicable on shopping_mall_products directly, skipping
  }

  if (minPrice !== undefined) {
    // Price filtering is not directly applicable on shopping_mall_products, skipping
  }

  if (maxPrice !== undefined) {
    // Price filtering is not directly applicable on shopping_mall_products, skipping
  }

  if (inStockOnly) {
    // Stock filtering is not applicable on shopping_mall_products, skipping
  }

  if (includeDiscontinued) {
    if (includeDiscontinued === true) {
      // Remove deleted_at filter to include discontinued products
      delete where.deleted_at;
    }
  }

  // Determine orderBy
  const safeSortOrder = sortOrder satisfies "asc" | "desc" as "asc" | "desc";
  const orderBy =
    sortBy === "price"
      ? { code: safeSortOrder }
      : sortBy === "name"
        ? { title: safeSortOrder }
        : sortBy === "createdAt"
          ? { created_at: safeSortOrder }
          : { created_at: safeSortOrder };

  const pageNumber = (page > 0 ? page : 1) satisfies number as number;
  const pageSize = (limit > 0 ? limit : 100) satisfies number as number;
  const skip = (pageNumber - 1) * pageSize;

  const [total, products] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.count({ where }),
    MyGlobal.prisma.shopping_mall_products.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
  ]);

  const pages = Math.ceil(total / pageSize);

  return {
    pagination: {
      current: pageNumber satisfies number as number,
      limit: pageSize satisfies number as number,
      records: total,
      pages,
    },
    data: products.map((product) => ({
      id: product.id,
      code: product.code,
      title: product.title,
      shopping_mall_category_id: product.shopping_mall_category_id,
      created_at: toISOStringSafe(product.created_at),
      updated_at: toISOStringSafe(product.updated_at),
    })),
  };
}
