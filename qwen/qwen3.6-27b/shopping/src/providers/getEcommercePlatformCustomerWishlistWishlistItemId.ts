import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformWishlistItemTransformer } from "../transformers/EcommercePlatformWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformCustomerWishlistWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformWishlistItem> {
  const authorization =
    await MyGlobal.prisma.ecommerce_platform_wishlist_items.findUniqueOrThrow({
      where: {
        id: props.wishlistItemId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_platform_customer_id: true,
      },
    });
  if (authorization.ecommerce_platform_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.ecommerce_platform_wishlist_items.findUniqueOrThrow({
      where: { id: props.wishlistItemId },
      ...EcommercePlatformWishlistItemTransformer.select(),
    });
  return await EcommercePlatformWishlistItemTransformer.transform(record);
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
// import { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformCustomerWishlistWishlistItemId(props: {
//   customer: CustomerPayload;
//   wishlistItemId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformWishlistItem> {
//   const record = await MyGlobal.prisma.ecommerce_platform_wishlist_items.findFirstOrThrow({
//     ...EcommercePlatformWishlistItemTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformWishlistItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------