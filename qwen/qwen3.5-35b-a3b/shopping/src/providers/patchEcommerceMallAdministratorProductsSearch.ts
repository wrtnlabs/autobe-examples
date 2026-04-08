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

export async function patchEcommerceMallAdministratorProductsSearch(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const search = props.body.search;
  const categoryIds = props.body.categoryIds;
  const sellerId = props.body.sellerId;
  const minPrice = props.body.minPrice;
  const maxPrice = props.body.maxPrice;
  const inStockOnly = props.body.inStockOnly;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const createdAtMin = props.body.createdAtMin;
  const createdAtMax = props.body.createdAtMax;
  const cursor = props.body.cursor;
  const whereConditions: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
  };
  if (search) {
    whereConditions.OR = [
      { name: { contains: search, mode: "insensitive" as const } },
      { description: { contains: search, mode: "insensitive" as const } },
    ];
  }
  if (categoryIds && categoryIds.length > 0) {
    whereConditions.category_id = { in: categoryIds };
  }
  if (sellerId) {
    whereConditions.seller_id = sellerId;
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    whereConditions.base_price = {
      ...(minPrice !== undefined && { gte: minPrice }),
      ...(maxPrice !== undefined && { lte: maxPrice }),
    };
  }
  if (createdAtMin !== undefined || createdAtMax !== undefined) {
    whereConditions.created_at = {
      ...(createdAtMin !== undefined && { gte: createdAtMin }),
      ...(createdAtMax !== undefined && { lte: createdAtMax }),
    };
  }
  if (inStockOnly === true) {
    whereConditions.variants = {
      some: {
        stock_quantity: { gt: 0 },
        deleted_at: null,
      },
    };
  }
  const orderByInput: Prisma.ecommerce_mall_productsOrderByWithRelationInput = {
    [sortBy]: sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
    id: "asc" as const,
  };
  let findManyArgs: Prisma.ecommerce_mall_productsFindManyArgs = {
    where: whereConditions,
    orderBy: orderByInput,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  };
  let data: any;
  let total: number;
  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf-8");
      const [cursorCreatedAt, cursorId] = decoded.split("|");
      const cursorCondition: Prisma.ecommerce_mall_productsWhereInput =
        sortOrder === "asc"
          ? {
              OR: [
                { created_at: { gt: cursorCreatedAt } },
                { created_at: cursorCreatedAt, id: { gt: cursorId } },
              ],
            }
          : {
              OR: [
                { created_at: { lt: cursorCreatedAt } },
                { created_at: cursorCreatedAt, id: { lt: cursorId } },
              ],
            };
      findManyArgs = {
        ...findManyArgs,
        skip: 1,
        take: sortOrder === "asc" ? limit : -limit,
        cursor: { id: cursorId },
        where: {
          ...whereConditions,
          AND: [cursorCondition],
        },
      };
      [data, total] = await Promise.all([
        MyGlobal.prisma.ecommerce_mall_products.findMany(findManyArgs),
        MyGlobal.prisma.ecommerce_mall_products.count({
          where: whereConditions,
        }),
      ]);
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
  } else {
    const skip = (page - 1) * limit;
    findManyArgs = {
      ...findManyArgs,
      skip,
      take: limit,
    };
    [data, total] = await Promise.all([
      MyGlobal.prisma.ecommerce_mall_products.findMany(findManyArgs),
      MyGlobal.prisma.ecommerce_mall_products.count({ where: whereConditions }),
    ]);
  }
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    pagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallProduct.ISummary;
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
// export async function patchEcommerceMallAdministratorProductsSearch(props: {
//   administrator: AdministratorPayload;
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