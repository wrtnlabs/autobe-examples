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

export async function putShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IUpdate;
}): Promise<IShoppingMallWishlistItem> {
  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: {
        id: true,
        shopping_mall_member_id: true,
      },
    });
  if (wishlist.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUniqueOrThrow({
      where: { id: props.wishlistItemId },
      select: {
        id: true,
        shopping_mall_wishlist_id: true,
        shopping_mall_product_id: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            deleted_at: true,
          },
        },
      },
    });
  if (existing.shopping_mall_wishlist_id !== props.wishlistId) {
    throw new HttpException("Forbidden", 403);
  }
  if (existing.product.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  if (props.body.shoppingMallProductId !== undefined) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
        where: {
          shopping_mall_wishlist_id: props.wishlistId,
          shopping_mall_product_id: props.body.shoppingMallProductId,
          id: { not: props.wishlistItemId },
        },
      });
    if (duplicate !== null) {
      throw new HttpException("Wishlist item already exists", 400);
    }
    const product =
      await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
        where: { id: props.body.shoppingMallProductId },
        select: {
          id: true,
          deleted_at: true,
        },
      });
    if (product.deleted_at !== null) {
      throw new HttpException("Not found", 404);
    }
  }
  const updatedAt = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_wishlist_items.update({
      where: { id: props.wishlistItemId },
      data: {
        ...(props.body.shoppingMallProductId !== undefined
          ? { shopping_mall_product_id: props.body.shoppingMallProductId }
          : {}),
        ...(props.body.deletedAt !== undefined
          ? {
              deleted_at:
                props.body.deletedAt === null
                  ? null
                  : toISOStringSafe(props.body.deletedAt),
            }
          : {}),
        updated_at: updatedAt,
      },
    });
    return tx.shopping_mall_wishlist_items.findUniqueOrThrow({
      where: { id: props.wishlistItemId },
      ...ShoppingMallWishlistItemTransformer.select(),
    });
  });
  return await ShoppingMallWishlistItemTransformer.transform(updated);
}
