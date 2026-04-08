import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallWishlistTransformer } from "../transformers/EcommerceMallWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallMemberWishlistsWishlistId(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IEcommerceMallWishlist.IUpdate;
}): Promise<IEcommerceMallWishlist> {
  const wishlist =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: {
        id: true,
        customer_id: true,
        deleted_at: true,
      },
    });
  if (wishlist.deleted_at !== null) {
    throw new HttpException("Wishlist is soft-deleted", 400);
  }
  if (wishlist.customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.customer_id !== undefined) {
    const newCustomer = await MyGlobal.prisma.ecommerce_mall_members.findFirst({
      where: {
        id: props.body.customer_id,
        deleted_at: null,
      },
    });
    if (newCustomer === null) {
      throw new HttpException("Customer not found or inactive", 400);
    }
    await MyGlobal.prisma.ecommerce_mall_wishlists.update({
      where: { id: props.wishlistId },
      data: {
        customer: { connect: { id: props.body.customer_id } },
        updated_at: new Date(),
      },
    });
  }
  const updated =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      ...EcommerceMallWishlistTransformer.select(),
    });
  return await EcommerceMallWishlistTransformer.transform(updated);
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
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallMemberWishlistsWishlistId(props: {
//   member: MemberPayload;
//   wishlistId: string & tags.Format<"uuid">;
//   body: IEcommerceMallWishlist.IUpdate;
// }): Promise<IEcommerceMallWishlist> {
//   await MyGlobal.prisma.ecommerce_mall_wishlists.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_wishlists.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallWishlistTransformer.select(),
//   });
//   return await EcommerceMallWishlistTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------