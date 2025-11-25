import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function postShoppingMallBuyerBuyersMeWishlistItemsWishlistItemIdMoveToCart(props: {
  buyer: BuyerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IMoveToCart;
}): Promise<IShoppingMallCartItem> {
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
      where: {
        id: props.wishlistItemId,
        shopping_mall_buyer_id: props.buyer.id,
        deleted_at: null,
      },
      include: {
        sku: true,
      },
    });

  if (!wishlistItem) {
    throw new HttpException(
      "Wishlist item not found or has already been removed",
      404,
    );
  }

  if (!wishlistItem.sku.enabled) {
    throw new HttpException("This product variant is no longer available", 400);
  }

  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_stocks.findUnique({
      where: {
        shopping_mall_sale_sku_id: wishlistItem.shopping_mall_sale_sku_id,
      },
    });

  if (!inventory) {
    throw new HttpException(
      "Inventory information not available for this product",
      404,
    );
  }

  if (inventory.available_quantity < props.body.quantity) {
    throw new HttpException(
      `Insufficient inventory. Only ${inventory.available_quantity} units available`,
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const currentPrice = (() => {
    if (
      wishlistItem.sku.sale_price !== null &&
      wishlistItem.sku.sale_start_at !== null &&
      wishlistItem.sku.sale_end_at !== null
    ) {
      const nowDate = new Date();
      const saleStart = new Date(wishlistItem.sku.sale_start_at);
      const saleEnd = new Date(wishlistItem.sku.sale_end_at);
      if (nowDate >= saleStart && nowDate <= saleEnd) {
        return wishlistItem.sku.sale_price;
      }
    }
    return wishlistItem.sku.base_price;
  })();

  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const existingCartItem = await tx.shopping_mall_cart_items.findFirst({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
        shopping_mall_sale_sku_id: wishlistItem.shopping_mall_sale_sku_id,
        deleted_at: null,
      },
    });

    let cartItem;
    if (existingCartItem) {
      cartItem = await tx.shopping_mall_cart_items.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + props.body.quantity,
          updated_at: now,
        },
      });
    } else {
      const newId: string & tags.Format<"uuid"> = v4();
      cartItem = await tx.shopping_mall_cart_items.create({
        data: {
          id: newId,
          shopping_mall_buyer_id: props.buyer.id,
          shopping_mall_sale_sku_id: wishlistItem.shopping_mall_sale_sku_id,
          quantity: props.body.quantity,
          unit_price_snapshot: currentPrice,
          created_at: now,
          updated_at: now,
        },
      });
    }

    await tx.shopping_mall_wishlist_items.update({
      where: { id: wishlistItem.id },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });

    return cartItem;
  });

  return {
    id: result.id,
    shopping_mall_buyer_id: result.shopping_mall_buyer_id,
    shopping_mall_sale_sku_id: result.shopping_mall_sale_sku_id,
    quantity: result.quantity,
    unit_price_snapshot: result.unit_price_snapshot,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
