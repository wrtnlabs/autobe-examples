import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallWishlistItemAtSummaryTransformer } from "../transformers/EcommerceMallWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberWishlistsWishlistIdItems(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IEcommerceMallWishlistItem.IRequest;
}): Promise<IPageIEcommerceMallWishlistItem.ISummary> {
  // Verify wishlist exists and member owns it
  const wishlist =
    await MyGlobal.prisma.ecommerce_mall_customer_wishlists.findFirst({
      where: {
        id: props.wishlistId,
        ecommerce_mall_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (wishlist === null) {
    throw new HttpException("Not Found", 404);
  }
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_mall_wishlist_itemsWhereInput = {
    ecommerce_mall_wishlist_id: props.wishlistId,
    deleted_at: null,
  };
  // Apply product filters
  const productFilters: Prisma.ecommerce_mall_productsWhereInput = {};
  // Apply product name search filter
  if (props.body.search !== undefined && props.body.search.length > 0) {
    productFilters.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Apply availability status filter
  if (props.body.status_filter === "available") {
    productFilters.variants = {
      some: {
        stock_quantity: {
          gt: 0,
        },
      },
    };
  } else if (props.body.status_filter === "unavailable") {
    productFilters.variants = {
      none: {
        stock_quantity: {
          gt: 0,
        },
      },
    };
  }
  // Set product filter if any conditions exist
  if (Object.keys(productFilters).length > 0) {
    whereInput.product = productFilters;
  }
  // Build ORDER BY clause
  const orderByInput: Prisma.ecommerce_mall_wishlist_itemsOrderByWithRelationInput[] =
    props.body.sort_by === "name"
      ? [
          {
            product: {
              name: "asc" as const,
            },
          },
        ]
      : [{ created_at: "desc" as const }];
  // Execute query
  const data = await MyGlobal.prisma.ecommerce_mall_wishlist_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallWishlistItemAtSummaryTransformer.select(),
  });
  // Execute count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_wishlist_items.count({
    where: whereInput,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
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
// import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberWishlistsWishlistIdItems(props: {
//   member: MemberPayload;
//   wishlistId: string & tags.Format<"uuid">;
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