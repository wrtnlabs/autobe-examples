import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistAtSummaryTransformer } from "../transformers/EcommerceMallWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlist.IRequest;
}): Promise<IPageIEcommerceMallWishlist.ISummary> {
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.ecommerce_mall_wishlistsWhereInput = {
    shopping_customer_id: props.customer.id,
  };
  const totalRecords = await MyGlobal.prisma.ecommerce_mall_wishlists.count({
    where: whereCondition,
  });
  const records = await MyGlobal.prisma.ecommerce_mall_wishlists.findMany({
    where: whereCondition,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallWishlistAtSummaryTransformer.select(),
  });
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallWishlistAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: totalRecords,
        pages: Math.ceil(totalRecords / limit),
      },
      data: [],
    },
    data: data,
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
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerWishlist(props: {
//   customer: CustomerPayload;
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