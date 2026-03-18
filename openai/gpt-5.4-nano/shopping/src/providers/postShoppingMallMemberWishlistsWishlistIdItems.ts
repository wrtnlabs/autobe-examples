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
import { ShoppingMallWishlistItemCollector } from "../collectors/ShoppingMallWishlistItemCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallWishlistItemTransformer } from "../transformers/ShoppingMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberWishlistsWishlistIdItems(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: {
      id: true,
      shopping_mall_member_id: true,
      deleted_at: true,
    },
  });
  if (wishlist === null || wishlist.deleted_at !== null) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.body.shopping_mall_product_id },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product is not eligible for wishlist", 400);
  }
  try {
    const created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
      data: await ShoppingMallWishlistItemCollector.collect({
        body: props.body,
        wishlist: { id: wishlist.id },
      }),
      ...ShoppingMallWishlistItemTransformer.select(),
    });
    return await ShoppingMallWishlistItemTransformer.transform(created);
  } catch (e: unknown) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpException("Wishlist item already exists", 409);
    }
    throw e;
  }
}
