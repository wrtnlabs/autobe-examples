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
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallWishlistItemTransformer } from "../transformers/ShoppingMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberWishlistsWishlistIdItems(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IShoppingMallWishlistItem> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const wishlist = await tx.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: {
        id: true,
        shopping_mall_member_id: true,
        deleted_at: true,
      },
    });
    if (wishlist.shopping_mall_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (wishlist.deleted_at !== null) {
      throw new HttpException("Wishlist not available", 410);
    }
    // Operation instruction semantics are inferred from DTO; treat each item as { productId } plus mode.
    // If mode is not present, assume add.
    const affectedProductIds = props.body.items.map((it) => {
      return (
        (
          it as {
            shoppingMallProductId?: string & tags.Format<"uuid">;
            shopping_mall_product_id?: string & tags.Format<"uuid">;
            productId?: string & tags.Format<"uuid">;
          }
        ).shoppingMallProductId ??
        (it as any).shopping_mall_product_id ??
        (it as any).productId
      );
    });
    const products = await tx.shopping_mall_products.findMany({
      where: {
        id: { in: affectedProductIds as string[] },
        deleted_at: null,
      },
      select: { id: true },
    });
    const allowed = new Set(products.map((p) => p.id));
    for (const item of props.body.items) {
      const productId =
        (
          item as {
            shoppingMallProductId?: string & tags.Format<"uuid">;
            shopping_mall_product_id?: string & tags.Format<"uuid">;
            productId?: string & tags.Format<"uuid">;
          }
        ).shoppingMallProductId ??
        (item as any).shopping_mall_product_id ??
        (item as any).productId;
      if (!allowed.has(productId)) {
        continue;
      }
      const existing = await tx.shopping_mall_wishlist_items.findUnique({
        where: {
          shopping_mall_wishlist_id_shopping_mall_product_id: {
            shopping_mall_wishlist_id: props.wishlistId,
            shopping_mall_product_id: productId,
          },
        },
        select: { id: true, deleted_at: true },
      });
      const shouldAdd =
        (item as any).operation === "add" ||
        (item as any).shouldAdd === true ||
        (item as any).type === "add";
      if (existing === null) {
        if (shouldAdd) {
          await tx.shopping_mall_wishlist_items.create({
            data: {
              id: v4() as any,
              shopping_mall_wishlist_id: props.wishlistId,
              shopping_mall_product_id: productId,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
          });
        }
      } else {
        if (shouldAdd) {
          if (existing.deleted_at !== null) {
            await tx.shopping_mall_wishlist_items.update({
              where: { id: existing.id },
              data: { deleted_at: null, updated_at: new Date() },
            });
          }
        } else {
          if (existing.deleted_at === null) {
            await tx.shopping_mall_wishlist_items.update({
              where: { id: existing.id },
              data: { deleted_at: new Date(), updated_at: new Date() },
            });
          }
        }
      }
    }
    const updated = await tx.shopping_mall_wishlist_items.findFirstOrThrow({
      where: {
        shopping_mall_wishlist_id: props.wishlistId,
        shopping_mall_product_id: allowed.values().next().value,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_wishlist_id: true,
        shopping_mall_product_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
      },
    });
    return await ShoppingMallWishlistItemTransformer.transform(updated as any);
  });
}
