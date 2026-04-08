import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallWishlistAtSummaryTransformer } from "../transformers/EcommerceMallWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberWishlists(props: {
  member: MemberPayload;
  body: IEcommerceMallWishlist.IRequest;
}): Promise<IPageIEcommerceMallWishlist.ISummary> {
  const customer_id: string & tags.Format<"uuid"> = props.member.id;
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_mall_wishlistsWhereInput = {
    customer_id,
  };
  // Status filter
  if (props.body.status === "active") {
    whereInput.deleted_at = null;
  } else if (props.body.status === "deleted") {
    whereInput.deleted_at = {
      not: null,
    };
  }
  // Date range filters (use ISO 8601 strings directly)
  if (props.body.created_after) {
    if (props.body.created_before) {
      whereInput.created_at = {
        gt: props.body.created_after,
        lt: props.body.created_before,
      };
    } else {
      whereInput.created_at = {
        gt: props.body.created_after,
      };
    }
  } else if (props.body.created_before) {
    whereInput.created_at = {
      lt: props.body.created_before,
    };
  }
  // Apply sorting
  const orderByInput: Prisma.ecommerce_mall_wishlistsOrderByWithRelationInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Query data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_wishlists.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallWishlistAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_wishlists.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallWishlistAtSummaryTransformer.transform,
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
// import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
// import { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberWishlists(props: {
//   member: MemberPayload;
//   body: IEcommerceMallWishlist.IRequest;
// }): Promise<IPageIEcommerceMallWishlist.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_wishlists.findMany({
//     ...EcommerceMallWishlistAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallWishlistAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------