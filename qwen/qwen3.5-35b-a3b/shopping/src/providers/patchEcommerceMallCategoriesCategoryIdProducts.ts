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

export async function patchEcommerceMallCategoriesCategoryIdProducts(props: {
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const cursor = props.body.cursor;
  const where: Prisma.ecommerce_mall_productsWhereInput = {
    category_id: props.categoryId,
    deleted_at: null,
  };
  if (props.body.search) {
    where.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.minPrice !== undefined) {
    where.base_price = { gte: props.body.minPrice };
  }
  if (props.body.maxPrice !== undefined) {
    where.base_price = { lte: props.body.maxPrice };
  }
  if (props.body.inStockOnly === true) {
    where.variants = {
      some: {
        stock_quantity: { gt: 0 },
      },
    };
  }
  if (props.body.createdAtMin !== undefined) {
    where.created_at = { gte: props.body.createdAtMin };
  }
  if (props.body.createdAtMax !== undefined) {
    where.created_at = { lte: props.body.createdAtMax };
  }
  let orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput;
  let skip: number | undefined;
  let take: number | undefined;
  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf-8");
      const parts = decoded.split("|");
      if (parts.length !== 2) {
        throw new HttpException("Invalid cursor format", 400);
      }
      const [createdAtStr, lastId] = parts;
      orderBy = { created_at: "desc", id: "desc" };
      where.AND = [
        { created_at: { lt: createdAtStr } },
        { id: { lt: lastId } },
      ];
      take = limit;
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
  } else {
    skip = (page - 1) * limit;
    take = limit;
    const sortBy = props.body.sortBy ?? "created_at";
    const sortOrder = props.body.sortOrder ?? "desc";
    orderBy = { [sortBy]: sortOrder };
  }
  const data = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where,
    ...EcommerceMallProductAtSummaryTransformer.select(),
    ...(orderBy ? { orderBy } : {}),
    ...(skip !== undefined ? { skip } : {}),
    ...(take !== undefined ? { take } : {}),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({ where });
  const pages = Math.ceil(total / limit) || 1;
  const current = page;
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
  const response: IPageIEcommerceMallProduct.ISummary = {
    pagination: {
      current,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: transformed,
  };
  return response;
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
// export async function patchEcommerceMallCategoriesCategoryIdProducts(props: {
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