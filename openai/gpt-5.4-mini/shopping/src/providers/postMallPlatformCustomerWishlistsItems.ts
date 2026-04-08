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
import { MallPlatformWishlistItemCollector } from "../collectors/MallPlatformWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformWishlistItemTransformer } from "../transformers/MallPlatformWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerWishlistsItems(props: {
  customer: CustomerPayload;
  body: IMallPlatformWishlistItem.ICreate;
}): Promise<IMallPlatformWishlistItem> {
  const record = await MyGlobal.prisma.$transaction(async (prisma) => {
    const wishlist = await prisma.mall_platform_wishlists.findFirstOrThrow({
      where: {
        customer: {
          id: props.customer.id,
        },
      },
      select: {
        id: true,
      },
    });
    await prisma.mall_platform_products.findUniqueOrThrow({
      where: {
        id: props.body.product_id,
      },
      select: {
        id: true,
      },
    });
    const existing = await prisma.mall_platform_wishlist_items.findFirst({
      where: {
        mall_platform_wishlist_id: wishlist.id,
        mall_platform_product_id: props.body.product_id,
      },
      select: {
        id: true,
      },
    });
    if (existing !== null) {
      throw new HttpException("Product already exists in wishlist", 409);
    }
    try {
      return await prisma.mall_platform_wishlist_items.create({
        data: await MallPlatformWishlistItemCollector.collect({
          body: props.body,
          wishlist,
        }),
        ...MallPlatformWishlistItemTransformer.select(),
      });
    } catch (error) {
      throw error;
    }
  });
  return await MallPlatformWishlistItemTransformer.transform(record);
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
// import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerWishlistsItems(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformWishlistItem.ICreate;
// }): Promise<IMallPlatformWishlistItem> {
//   const record = await MyGlobal.prisma.mall_platform_wishlist_items.create({
//     data: await MallPlatformWishlistItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformWishlistItemTransformer.select(),
//   });
//   return await MallPlatformWishlistItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------