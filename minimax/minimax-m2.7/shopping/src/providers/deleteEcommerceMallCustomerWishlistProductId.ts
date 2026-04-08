import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerWishlistProductId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find customer's wishlist
  const wishlist = await MyGlobal.prisma.ecommerce_mall_wishlists.findUnique({
    where: { shopping_customer_id: props.customer.id },
    select: { id: true },
  });
  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }
  // 2. Find the wishlist item to delete
  const wishlistItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findFirst({
      where: {
        ecommerce_mall_wishlist_id: wishlist.id,
        ecommerce_mall_product_id: props.productId,
      },
      select: { id: true },
    });
  if (wishlistItem === null) {
    throw new HttpException("Wishlist item not found", 404);
  }
  // 3. Delete the wishlist item
  await MyGlobal.prisma.ecommerce_mall_wishlist_items.delete({
    where: { id: wishlistItem.id },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallCustomerWishlistProductId(props: {
//   customer: CustomerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------