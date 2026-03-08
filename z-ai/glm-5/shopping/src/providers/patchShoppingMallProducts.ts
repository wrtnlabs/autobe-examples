import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereInput = buildWhereConditions(props.body);
  // Execute queries sequentially
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  return {
    data: await Promise.all(
      products.map((p) => ShoppingMallProductAtSummaryTransformer.transform(p)),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
function buildWhereConditions(
  body: IShoppingMallProduct.IRequest,
): Prisma.shopping_mall_productsWhereInput {
  const where: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    seller: {
      approval_status: "approved",
      suspended: false,
      banned: false,
      deleted_at: null,
    },
  };
  // Category filter (caller handles subcategory resolution)
  if (body.shopping_mall_category_id !== undefined) {
    where.shopping_mall_category_id = body.shopping_mall_category_id;
  }
  // Search filter
  if (body.search !== undefined && body.search.length > 0) {
    where.name = {
      contains: body.search,
      mode: "insensitive",
    } satisfies Prisma.StringFilter;
  }
  // Price range filter - filter products where any variant's effective price is in range
  if (body.min_price !== undefined || body.max_price !== undefined) {
    where.AND = where.AND ?? [];
    // Build conditions for variants with price or products without variants using base_price
    const priceConditions: Prisma.shopping_mall_productsWhereInput[] = [];
    if (body.min_price !== undefined && body.max_price !== undefined) {
      priceConditions.push(
        // Variant with explicit price in range
        {
          variants: {
            some: {
              deleted_at: null,
              price: { gte: body.min_price, lte: body.max_price },
            },
          },
        },
        // Variant without price (uses base_price) where base_price is in range
        {
          variants: {
            some: {
              deleted_at: null,
              price: null,
            },
          },
          base_price: { gte: body.min_price, lte: body.max_price },
        },
        // Product without variants where base_price is in range
        {
          variants: { none: {} },
          base_price: { gte: body.min_price, lte: body.max_price },
        },
      );
    } else if (body.min_price !== undefined) {
      priceConditions.push(
        {
          variants: {
            some: {
              deleted_at: null,
              price: { gte: body.min_price },
            },
          },
        },
        {
          variants: {
            some: {
              deleted_at: null,
              price: null,
            },
          },
          base_price: { gte: body.min_price },
        },
        {
          variants: { none: {} },
          base_price: { gte: body.min_price },
        },
      );
    } else if (body.max_price !== undefined) {
      priceConditions.push(
        {
          variants: {
            some: {
              deleted_at: null,
              price: { lte: body.max_price },
            },
          },
        },
        {
          variants: {
            some: {
              deleted_at: null,
              price: null,
            },
          },
          base_price: { lte: body.max_price },
        },
        {
          variants: { none: {} },
          base_price: { lte: body.max_price },
        },
      );
    }
    (where.AND as Prisma.shopping_mall_productsWhereInput[]).push({
      OR: priceConditions,
    });
  }
  // In-stock filter - products with at least one variant having stock > 0
  if (body.in_stock === true) {
    where.AND = where.AND ?? [];
    (where.AND as Prisma.shopping_mall_productsWhereInput[]).push({
      variants: {
        some: {
          deleted_at: null,
          inventoryRecords: {
            some: {}, // Has inventory records - the transformer calculates stock
          },
        },
      },
    });
  }
  return where;
}
