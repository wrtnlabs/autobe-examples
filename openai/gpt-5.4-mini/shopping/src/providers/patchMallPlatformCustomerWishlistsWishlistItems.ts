import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function patchMallPlatformCustomerWishlistsWishlistItems(props: {
  customer: CustomerPayload;
  body: IMallPlatformWishlistItem.IRequest;
}): Promise<IPageIMallPlatformWishlistItem.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const trimmedSearch: string = props.body.search?.trim() ?? "";
  const search: string | undefined =
    trimmedSearch.length > 0 ? trimmedSearch : undefined;
  const orderBy: Prisma.mall_platform_wishlist_itemsOrderByWithRelationInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : props.body.sort === "updated_at_asc"
        ? { updated_at: "asc" }
        : props.body.sort === "updated_at_desc"
          ? { updated_at: "desc" }
          : { created_at: "desc" };
  const where: Prisma.mall_platform_wishlist_itemsWhereInput = {
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
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }),
    },
  };
  const records = await MyGlobal.prisma.mall_platform_wishlist_items.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...MallPlatformWishlistItemAtSummaryTransformer.select(),
  });
  const total: number =
    await MyGlobal.prisma.mall_platform_wishlist_items.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformWishlistItemAtSummaryTransformer.transform,
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
// import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
// import { IPageIMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlistItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerWishlistsWishlistItems(props: {
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