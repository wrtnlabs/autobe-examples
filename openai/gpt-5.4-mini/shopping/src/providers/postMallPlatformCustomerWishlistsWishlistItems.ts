import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function postMallPlatformCustomerWishlistsWishlistItems(props: {
  customer: CustomerPayload;
  body: IMallPlatformWishlistItem.ICreate;
}): Promise<IMallPlatformWishlistItem> {
  const wishlist =
    await MyGlobal.prisma.mall_platform_wishlists.findFirstOrThrow({
      select: {
        id: true,
      },
    });
  const product = await MyGlobal.prisma.mall_platform_products.findFirst({
    where: {
      id: props.body.product_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  try {
    const record = await MyGlobal.prisma.mall_platform_wishlist_items.create({
      data: await MallPlatformWishlistItemCollector.collect({
        body: props.body,
        wishlist,
      }),
      ...MallPlatformWishlistItemTransformer.select(),
    });
    return await MallPlatformWishlistItemTransformer.transform(record);
  } catch (exception) {
    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === "P2002"
    ) {
      throw new HttpException("Wishlist item already exists", 409);
    }
    throw exception;
  }
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
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerWishlistsWishlistItems(props: {
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