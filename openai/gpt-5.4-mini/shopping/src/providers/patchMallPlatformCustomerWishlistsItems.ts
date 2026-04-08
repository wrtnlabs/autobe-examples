import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformWishlistItemAtSummaryTransformer } from "../transformers/MallPlatformWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerWishlistsItems(props: {
  customer: CustomerPayload;
  body: IMallPlatformWishlistItem.IRequest;
}): Promise<IPageIMallPlatformWishlistItem.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const search: string | undefined =
    props.body.search !== undefined && props.body.search.length > 0
      ? props.body.search
      : undefined;
  const where = {
    deleted_at: null,
    wishlist: {
      customer: {
        id: props.customer.id,
      },
    },
    product: {
      deleted_at: null,
      ...(search === undefined
        ? {}
        : {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }),
    },
  } satisfies Prisma.mall_platform_wishlist_itemsWhereInput;
  const orderBy = (
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "product_asc"
        ? { product: { name: "asc" } }
        : props.body.sort === "product_desc"
          ? { product: { name: "desc" } }
          : { created_at: "desc" }
  ) satisfies Prisma.mall_platform_wishlist_itemsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.mall_platform_wishlist_items.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    ...MallPlatformWishlistItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_wishlist_items.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformWishlistItemAtSummaryTransformer.transform,
    ),
  } satisfies IPageIMallPlatformWishlistItem.ISummary;
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
// import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
// import { IPageIMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlistItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerWishlistsItems(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformWishlistItem.IRequest;
// }): Promise<IPageIMallPlatformWishlistItem.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_wishlist_items.findMany({
//     ...MallPlatformWishlistItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformWishlistItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------