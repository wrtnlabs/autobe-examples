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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerProductsSearch(props: {
  customer: CustomerPayload;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
  };
  if (props.body.search !== null && props.body.search.length > 0) {
    where.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.subcategoryId !== null) {
    where.category_id = props.body.subcategoryId;
  } else if (props.body.categoryId !== null) {
    where.category = {
      OR: [{ id: props.body.categoryId }, { parent_id: props.body.categoryId }],
    };
  }
  if (props.body.minPrice !== null || props.body.maxPrice !== null) {
    where.base_price = {};
    if (props.body.minPrice !== null) {
      where.base_price.gte = props.body.minPrice;
    }
    if (props.body.maxPrice !== null) {
      where.base_price.lte = props.body.maxPrice;
    }
  }
  const sortBy = props.body.sortBy ?? "newest";
  let orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput;
  if (sortBy === "priceAsc") {
    orderBy = { base_price: "asc" };
  } else if (sortBy === "priceDesc") {
    orderBy = { base_price: "desc" };
  } else {
    orderBy = { created_at: "desc" };
  }
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({ where });
  const records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    ...EcommerceMallProductAtSummaryTransformer.select(),
    where,
    skip,
    take: limit,
    orderBy,
  });
  let data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
  if (props.body.inStockOnly === true) {
    data = data.filter((item) => item.availabilityStatus === "available");
  }
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
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
// export async function patchEcommerceMallCustomerProductsSearch(props: {
//   customer: CustomerPayload;
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