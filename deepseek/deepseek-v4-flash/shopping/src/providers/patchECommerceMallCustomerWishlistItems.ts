import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallWishlistItemAtSummaryTransformer } from "../transformers/ECommerceMallWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IECommerceMallWishlistItem.IRequest;
}): Promise<IPageIECommerceMallWishlistItem.ISummary> {
  // Step 1: Auto-cleanup — soft-delete wishlist items whose referenced
  // product has been deleted (deleted_at IS NOT NULL or visibility = 'deleted')
  await MyGlobal.prisma.e_commerce_mall_wishlist_items.updateMany({
    where: {
      e_commerce_mall_customer_id: props.customer.id,
      deleted_at: null,
      product: {
        OR: [{ deleted_at: { not: null } }, { visibility: "deleted" }],
      },
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Step 2: Pagination defaults from request
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Step 3: Build filter conditions
  const productNameFilter:
    | {
        contains: string;
      }
    | undefined =
    props.body.search !== undefined
      ? { contains: props.body.search }
      : undefined;
  const whereInput: Prisma.e_commerce_mall_wishlist_itemsWhereInput = {
    e_commerce_mall_customer_id: props.customer.id,
    deleted_at: null,
    product: {
      deleted_at: null,
      visibility: { not: "deleted" },
      ...(productNameFilter !== undefined ? { name: productNameFilter } : {}),
    },
  } satisfies Prisma.e_commerce_mall_wishlist_itemsWhereInput;
  // Step 4: Fetch paginated records with transformer select
  const records: ECommerceMallWishlistItemAtSummaryTransformer.Payload[] =
    await MyGlobal.prisma.e_commerce_mall_wishlist_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallWishlistItemAtSummaryTransformer.select(),
    });
  // Step 5: Count total matching records
  const total: number =
    await MyGlobal.prisma.e_commerce_mall_wishlist_items.count({
      where: whereInput,
    });
  // Step 6: Build paginated response using the transformer
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallWishlistItemAtSummaryTransformer.transform,
    ),
  } satisfies IPageIECommerceMallWishlistItem.ISummary;
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
// import { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
// import { IPageIECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallWishlistItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallCustomerWishlistItems(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallWishlistItem.IRequest;
// }): Promise<IPageIECommerceMallWishlistItem.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_wishlist_items.findMany({
//     ...ECommerceMallWishlistItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallWishlistItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------