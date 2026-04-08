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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellersMeProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  // Seller must be approved to list products
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { id: props.seller.id },
    select: { approval_status: true },
  });
  if (!seller || seller.approval_status !== "approved") {
    throw new HttpException("Only approved sellers can access products", 403);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereClause: Prisma.ecommerce_mall_productsWhereInput = {
    ecommerce_mall_seller_id: props.seller.id,
    // Name filter - case-insensitive partial match
    ...(props.body.query && {
      name: { contains: props.body.query, mode: "insensitive" },
    }),
    // Category filter - exact match
    ...(props.body.category && {
      ecommerce_mall_category_id: props.body.category,
    }),
    // Status filter - active (deleted_at IS NULL) or deleted (deleted_at IS NOT NULL)
    ...(props.body.status === "deleted"
      ? { deleted_at: { not: null } }
      : props.body.status === "active" || props.body.status === undefined
        ? { deleted_at: null }
        : {}),
    // In stock filter - check if any variant has quantity > 0
    ...(props.body.inStock === true && {
      variants: {
        some: {
          quantity: { gt: 0 },
          deleted_at: null,
        },
      },
    }),
  };
  // Build orderBy
  const orderByInput = (() => {
    const sortBy = props.body.sortBy ?? "created_at";
    const sortOrder = props.body.sortOrder ?? "desc";
    return { [sortBy]: sortOrder };
  })() as Prisma.ecommerce_mall_productsOrderByWithRelationInput;
  // Execute queries sequentially
  const records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: whereClause,
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
// export async function patchEcommerceMallSellerSellersMeProducts(props: {
//   seller: SellerPayload;
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