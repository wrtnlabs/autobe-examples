import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistItemAtSummaryTransformer } from "../transformers/EcommerceMallWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.IRequest;
}): Promise<IPageIEcommerceMallWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput = (
    sortBy === "name"
      ? { product: { name: sortOrder } }
      : sortBy === "base_price"
        ? { product: { base_price: sortOrder } }
        : { created_at: sortOrder }
  ) satisfies Prisma.ecommerce_mall_wishlist_itemsOrderByWithRelationInput;
  const whereInput = {
    customer_id: props.customer.id,
    product: {
      deleted_at: null,
      ...(props.body.search && {
        name: { contains: props.body.search, mode: "insensitive" as const },
      }),
      ...(props.body.category_id && {
        category_id: props.body.category_id,
      }),
      ...(props.body.seller_id && {
        seller_id: props.body.seller_id,
      }),
      ...(props.body.min_price !== undefined && {
        base_price: { gte: props.body.min_price },
      }),
      ...(props.body.max_price !== undefined && {
        base_price: { lte: props.body.max_price },
      }),
    },
  } satisfies Prisma.ecommerce_mall_wishlist_itemsWhereInput;
  const records = await MyGlobal.prisma.ecommerce_mall_wishlist_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallWishlistItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_wishlist_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallWishlistItemAtSummaryTransformer.transform,
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
// import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
// import { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerWishlistItems(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallWishlistItem.IRequest;
// }): Promise<IPageIEcommerceMallWishlistItem.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_wishlist_items.findMany({
//     ...EcommerceMallWishlistItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallWishlistItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------