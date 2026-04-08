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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminProducts(props: {
  admin: AdminPayload;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions with soft-delete filter
  const whereConditions: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
  };
  // Name search (case-insensitive partial match)
  if (props.body.query) {
    whereConditions.name = {
      contains: props.body.query,
      mode: "insensitive",
    };
  }
  // Category filter
  if (props.body.category) {
    whereConditions.ecommerce_mall_category_id = props.body.category;
  }
  // Seller filter
  if (props.body.sellerId) {
    whereConditions.ecommerce_mall_seller_id = props.body.sellerId;
  }
  // Price range filters
  if (props.body.minPrice !== undefined && props.body.maxPrice !== undefined) {
    whereConditions.base_price = {
      gte: props.body.minPrice,
      lte: props.body.maxPrice,
    };
  } else if (props.body.minPrice !== undefined) {
    whereConditions.base_price = {
      gte: props.body.minPrice,
    };
  } else if (props.body.maxPrice !== undefined) {
    whereConditions.base_price = {
      lte: props.body.maxPrice,
    };
  }
  // In-stock filter: product must have at least one variant with quantity > 0
  if (props.body.inStock === true) {
    whereConditions.variants = {
      some: {
        quantity: {
          gt: 0,
        },
      },
    };
  }
  // Sorting
  const orderByInput = (
    props.body.sort === "price_asc"
      ? { base_price: "asc" as const }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_productsOrderByWithRelationInput;
  // Execute queries sequentially (findMany then count)
  const records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: whereConditions,
  });
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminProducts(props: {
//   admin: AdminPayload;
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