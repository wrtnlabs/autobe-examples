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

export async function deleteECommerceMallCustomerWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Idempotent lookup: if item doesn't exist or is already soft-deleted, silently return success
  const item = await MyGlobal.prisma.e_commerce_mall_wishlist_items.findFirst({
    where: {
      id: props.wishlistItemId,
      deleted_at: null,
    },
    select: {
      id: true,
      e_commerce_mall_customer_id: true,
    },
  });
  if (item === null) {
    return;
  }
  // Ownership validation: only the owning customer can remove their own wishlist items
  if (item.e_commerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Generate current timestamp as ISO string (no Date type stored, only passed as string to Prisma)
  const now: string = new Date().toISOString();
  // Perform soft delete — Prisma accepts ISO 8601 strings for DateTime fields
  await MyGlobal.prisma.e_commerce_mall_wishlist_items.update({
    where: {
      id: props.wishlistItemId,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
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
// export async function deleteECommerceMallCustomerWishlistItemsWishlistItemId(props: {
//   customer: CustomerPayload;
//   wishlistItemId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------