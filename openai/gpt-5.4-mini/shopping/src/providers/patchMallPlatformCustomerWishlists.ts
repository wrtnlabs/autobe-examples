import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformWishlistAtSummaryTransformer } from "../transformers/MallPlatformWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IMallPlatformWishlist.IRequest;
}): Promise<IPageIMallPlatformWishlist.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_wishlist_itemsWhereInput = {
    deleted_at: null,
    wishlist: {
      is: {
        customer: {
          is: {
            id: props.customer.id,
          },
        },
      },
    },
    product: {
      deleted_at: null,
      ...(props.body.search !== undefined && props.body.search.length > 0
        ? {
            OR: [
              {
                name: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
  };
  const records = await MyGlobal.prisma.mall_platform_wishlist_items.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...MallPlatformWishlistAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_wishlist_items.count({
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
      MallPlatformWishlistAtSummaryTransformer.transform,
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
// import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
// import { IPageIMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlist";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerWishlists(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformWishlist.IRequest;
// }): Promise<IPageIMallPlatformWishlist.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_wishlist_items.findMany({
//     ...MallPlatformWishlistAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformWishlistAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------