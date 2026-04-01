import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallWishlistItemTransformer } from "../transformers/ShoppingMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberWishlistsWishlistIdItems(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      shopping_mall_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!wishlist) {
    throw new HttpException("Forbidden", 403);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: props.body.shopping_mall_product_id, deleted_at: null },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  const nowIso = new Date().toISOString() as unknown as string &
    tags.Format<"date-time">;
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    try {
      const row = await tx.shopping_mall_wishlist_items.create({
        data: {
          id: v4(),
          created_at: nowIso,
          updated_at: nowIso,
          deleted_at: null,
          shopping_mall_wishlist_id: wishlist.id,
          shopping_mall_product_id: props.body.shopping_mall_product_id,
        },
        ...ShoppingMallWishlistItemTransformer.select(),
      });
      return row;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new HttpException("Already added", 409);
      }
      throw e;
    }
  });
  return await ShoppingMallWishlistItemTransformer.transform(created);
}
