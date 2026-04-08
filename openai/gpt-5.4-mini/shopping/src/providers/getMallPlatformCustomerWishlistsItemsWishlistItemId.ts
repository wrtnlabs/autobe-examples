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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformWishlistItemTransformer } from "../transformers/MallPlatformWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerWishlistsItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformWishlistItem> {
  const record =
    await MyGlobal.prisma.mall_platform_wishlist_items.findFirstOrThrow({
      where: {
        id: props.wishlistItemId,
        wishlist: {
          customer: {
            id: props.customer.id,
          },
        },
      },
      ...MallPlatformWishlistItemTransformer.select(),
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
// export async function getMallPlatformCustomerWishlistsItemsWishlistItemId(props: {
//   customer: CustomerPayload;
//   wishlistItemId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformWishlistItem> {
//   const record = await MyGlobal.prisma.mall_platform_wishlist_items.findFirstOrThrow({
//     ...MallPlatformWishlistItemTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformWishlistItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------