import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProducts(props: {
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    seller: {
      approval_status: "approved",
      deleted_at: null,
    },
  };
  // Text search on product name
  if (props.body.search) {
    whereConditions.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Category filter (subcategoryId takes precedence if both provided)
  if (props.body.subcategoryId) {
    whereConditions.category_id = props.body.subcategoryId;
  } else if (props.body.categoryId) {
    whereConditions.category_id = props.body.categoryId;
  }
  // Price range filters
  if (props.body.minPrice !== null || props.body.maxPrice !== null) {
    whereConditions.base_price = {};
    if (props.body.minPrice !== null) {
      whereConditions.base_price.gte = props.body.minPrice;
    }
    if (props.body.maxPrice !== null) {
      whereConditions.base_price.lte = props.body.maxPrice;
    }
  }
  // Stock availability filter - products with at least one variant having positive inventory
  if (props.body.inStockOnly) {
    whereConditions.variants = {
      some: {
        inventoryRecords: {
          some: {
            quantity_change: { gt: 0 },
          },
        },
      },
    };
  }
  // Sorting
  const orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    props.body.sortBy === "priceAsc"
      ? { base_price: "asc" }
      : props.body.sortBy === "priceDesc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  // Execute queries sequentially
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: whereConditions,
  });
  // Transform results
  const transformedProducts = await ArrayUtil.asyncMap(
    products,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
  return {
    data: transformedProducts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
