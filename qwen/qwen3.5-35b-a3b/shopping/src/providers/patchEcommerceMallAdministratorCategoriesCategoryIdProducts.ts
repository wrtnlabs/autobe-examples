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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorCategoriesCategoryIdProducts(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  // Verify category exists
  await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
  });
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_mall_productsWhereInput = {
    category_id: props.categoryId,
    deleted_at: null,
    ...(props.body.search !== undefined
      ? {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {}),
    ...(props.body.minPrice !== undefined
      ? { base_price: { gte: props.body.minPrice } }
      : {}),
    ...(props.body.maxPrice !== undefined
      ? { base_price: { lte: props.body.maxPrice } }
      : {}),
  };
  // In-stock filter requires checking variants
  const inStockWhere =
    props.body.inStockOnly === true
      ? {
          ...whereInput,
          variants: { some: { stock_quantity: { gt: 0 } } },
        }
      : whereInput;
  // Cursor-based pagination
  if (props.body.cursor !== undefined) {
    // Decode cursor: Base64(cursorValue|id)
    const decodedCursor = Buffer.from(props.body.cursor, "base64").toString(
      "utf-8",
    );
    const separatorIndex = decodedCursor.indexOf("|");
    const cursorValue = decodedCursor.slice(0, separatorIndex);
    const cursorId = decodedCursor.slice(separatorIndex + 1);
    // Determine sort field from request or use default
    const sortByField = props.body.sortBy ?? "created_at";
    const sortOrder = (props.body.sortOrder ?? "desc") as "asc" | "desc";
    // Build sort order for query
    const orderByInput: Prisma.ecommerce_mall_productsOrderByWithRelationInput[] =
      sortByField === "name"
        ? [{ name: sortOrder }]
        : sortByField === "base_price"
          ? [{ base_price: sortOrder }]
          : [{ created_at: sortOrder }];
    // Build cursor condition based on sort field
    const cursorCondition: Prisma.ecommerce_mall_productsWhereInput[] = [
      inStockWhere,
    ];
    if (sortByField === "name") {
      cursorCondition.push({
        OR: [
          { name: { gt: cursorValue } },
          {
            AND: [{ name: { equals: cursorValue } }, { id: { gt: cursorId } }],
          },
        ],
      });
    } else if (sortByField === "base_price") {
      cursorCondition.push({
        OR: [
          { base_price: { gt: Number(cursorValue) } },
          {
            AND: [
              { base_price: { equals: Number(cursorValue) } },
              { id: { gt: cursorId } },
            ],
          },
        ],
      });
    } else {
      cursorCondition.push({
        OR: [
          { created_at: { gt: cursorValue } },
          {
            AND: [
              { created_at: { equals: cursorValue } },
              { id: { gt: cursorId } },
            ],
          },
        ],
      });
    }
    const limit = Math.min(props.body.limit ?? 50, 50);
    const data = await MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: { AND: cursorCondition },
      ...EcommerceMallProductAtSummaryTransformer.select(),
      orderBy: orderByInput,
      take: limit,
    });
    const total = await MyGlobal.prisma.ecommerce_mall_products.count({
      where: inStockWhere,
    });
    const page = 1;
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: await ArrayUtil.asyncMap(
        data,
        EcommerceMallProductAtSummaryTransformer.transform,
      ),
    };
  }
  // Page-based pagination
  const page = (props.body.page ?? 1) || 1;
  const limit = Math.min(props.body.limit ?? 50, 50);
  const skip = (page - 1) * limit;
  const sortByField = props.body.sortBy ?? "created_at";
  const sortOrder = (props.body.sortOrder ?? "desc") as "asc" | "desc";
  const orderByInput: Prisma.ecommerce_mall_productsOrderByWithRelationInput[] =
    sortByField === "name"
      ? [{ name: sortOrder }]
      : sortByField === "base_price"
        ? [{ base_price: sortOrder }]
        : [{ created_at: sortOrder }];
  const data = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: inStockWhere,
    ...EcommerceMallProductAtSummaryTransformer.select(),
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: inStockWhere,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
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
// export async function patchEcommerceMallAdministratorCategoriesCategoryIdProducts(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
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