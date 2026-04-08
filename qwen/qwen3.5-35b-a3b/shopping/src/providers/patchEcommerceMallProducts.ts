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
  // Build WHERE clause with soft-delete filter
  const whereInput: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
  };
  // Apply cursor-based pagination filtering
  if (props.body.cursor) {
    const decoded = Buffer.from(props.body.cursor, "base64").toString("utf-8");
    const parts = decoded.split("|");
    whereInput.OR = [
      { created_at: { gt: parts[0] } },
      { created_at: parts[0], id: { gt: parts[1] } },
    ];
  }
  // Apply search filter
  if (props.body.search) {
    whereInput.OR = [
      ...(whereInput.OR ?? []),
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Apply category filter
  if (props.body.categoryIds && props.body.categoryIds.length > 0) {
    whereInput.category_id = { in: props.body.categoryIds };
  }
  // Apply seller filter
  if (props.body.sellerId) {
    whereInput.seller_id = props.body.sellerId;
  }
  // Apply price range filter
  if (props.body.minPrice !== undefined || props.body.maxPrice !== undefined) {
    const basePriceFilter: Prisma.FloatFilter<"ecommerce_mall_products"> = {};
    if (props.body.minPrice !== undefined) {
      basePriceFilter.gte = props.body.minPrice;
    }
    if (props.body.maxPrice !== undefined) {
      basePriceFilter.lte = props.body.maxPrice;
    }
    whereInput.base_price = basePriceFilter;
  }
  // Apply date range filter
  if (
    props.body.createdAtMin !== undefined ||
    props.body.createdAtMax !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter<"ecommerce_mall_products"> =
      {};
    if (props.body.createdAtMin !== undefined) {
      createdAtFilter.gte = props.body.createdAtMin;
    }
    if (props.body.createdAtMax !== undefined) {
      createdAtFilter.lte = props.body.createdAtMax;
    }
    whereInput.created_at = createdAtFilter;
  }
  // Handle inStockOnly filter via variants subquery
  if (props.body.inStockOnly) {
    whereInput.variants = {
      some: {
        stock_quantity: {
          gt: 0,
        },
      },
    };
  }
  // Build ORDER BY clause
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_productsOrderByWithRelationInput[] =
    sortBy === "name"
      ? [{ name: sortOrder }]
      : sortBy === "base_price"
        ? [{ base_price: sortOrder }]
        : [{ created_at: sortOrder }];
  // Calculate skip for page-based pagination
  const skip = page > 1 ? (page - 1) * limit : 0;
  // Fetch records with transformer select
  const records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: skip,
    take: limit + 1,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  // Handle next page marker
  if (records.length > limit) {
    records.splice(limit, 1);
  }
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallProductAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallProducts(props: {
//   body: IEcommerceMallProduct.IRequest;
// }): Promise<IPageIEcommerceMallProduct.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
//     ...EcommerceMallProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------