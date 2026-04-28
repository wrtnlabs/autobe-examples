import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformWishlistItemAtSummaryTransformer } from "../transformers/EcommercePlatformWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformWishlistItem.IRequest;
}): Promise<IPageIEcommercePlatformWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_platform_wishlist_itemsWhereInput = {
    ecommerce_platform_customer_id: props.customer.id,
    deleted_at: null,
    product: {
      deleted_at: null,
      ...(props.body.search
        ? { name: { contains: props.body.search, mode: "insensitive" } }
        : {}),
    },
  };
  const savedFrom = props.body.savedFrom;
  const savedTo = props.body.savedTo;
  if (savedFrom || savedTo) {
    whereInput.created_at = {
      ...(savedFrom ? { gte: savedFrom } : {}),
      ...(savedTo ? { lt: savedTo } : {}),
    };
  }
  const orderByInput: Prisma.ecommerce_platform_wishlist_itemsOrderByWithRelationInput =
    props.body.sort === "name"
      ? { product: { name: props.body.order ?? "asc" } }
      : { created_at: props.body.order ?? "desc" };
  const records =
    await MyGlobal.prisma.ecommerce_platform_wishlist_items.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommercePlatformWishlistItemAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_platform_wishlist_items.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformWishlistItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommercePlatformWishlistItem.ISummary;
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
// import { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
// import { IPageIEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformWishlistItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomerWishlist(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformWishlistItem.IRequest;
// }): Promise<IPageIEcommercePlatformWishlistItem.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_wishlist_items.findMany({
//     ...EcommercePlatformWishlistItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformWishlistItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------