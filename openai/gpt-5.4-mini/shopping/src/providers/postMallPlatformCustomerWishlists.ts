import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformWishlistCollector } from "../collectors/MallPlatformWishlistCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformWishlistTransformer } from "../transformers/MallPlatformWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IMallPlatformWishlist.ICreate;
}): Promise<IMallPlatformWishlist> {
  const existing = await MyGlobal.prisma.mall_platform_wishlists.findFirst({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null) {
    throw new HttpException("Wishlist already exists", 409);
  }
  await MyGlobal.prisma.mall_platform_wishlists.create({
    data: await MallPlatformWishlistCollector.collect({
      body: props.body,
      customer: props.customer,
    }),
  });
  const record =
    await MyGlobal.prisma.mall_platform_wishlists.findUniqueOrThrow({
      where: {
        customer_id: props.customer.id,
      },
      ...MallPlatformWishlistTransformer.select(),
    });
  return await MallPlatformWishlistTransformer.transform(record);
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
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerWishlists(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformWishlist.ICreate;
// }): Promise<IMallPlatformWishlist> {
//   const record = await MyGlobal.prisma.mall_platform_wishlists.create({
//     data: await MallPlatformWishlistCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformWishlistTransformer.select(),
//   });
//   return await MallPlatformWishlistTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------