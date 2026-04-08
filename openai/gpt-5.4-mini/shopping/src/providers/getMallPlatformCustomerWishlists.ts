import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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

export async function getMallPlatformCustomerWishlists(props: {
  customer: CustomerPayload;
}): Promise<IPageIMallPlatformWishlist.ISummary> {
  const where = {
    customer_id: props.customer.id,
    deleted_at: null,
  } satisfies Prisma.mall_platform_wishlistsWhereInput;
  const records = await MyGlobal.prisma.mall_platform_wishlists.findMany({
    where,
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    ...MallPlatformWishlistAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_wishlists.count({
    where,
  });
  return {
    pagination: {
      current: 1,
      limit: records.length === 0 ? 1 : records.length,
      records: total,
      pages: total === 0 ? 0 : 1,
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
// import { IPageIMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlist";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformCustomerWishlists(props: {
//   customer: CustomerPayload;
// }): Promise<IPageIMallPlatformWishlist.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_wishlists.findMany({
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