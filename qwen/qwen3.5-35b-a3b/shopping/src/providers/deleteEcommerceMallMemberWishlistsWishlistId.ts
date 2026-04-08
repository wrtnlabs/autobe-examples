import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallMemberWishlistsWishlistId(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify wishlist exists and belongs to authenticated member
  const wishlist = await MyGlobal.prisma.ecommerce_mall_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      customer_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (wishlist === null) {
    throw new HttpException("Not found", 404);
  }
  // Soft delete: set deleted_at and updated_at
  await MyGlobal.prisma.ecommerce_mall_wishlists.update({
    where: { id: props.wishlistId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
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
// export async function deleteEcommerceMallMemberWishlistsWishlistId(props: {
//   member: MemberPayload;
//   wishlistId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------