import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCartTransformer } from "../transformers/ShoppingMallCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberCartFromWishlists(props: {
  member: MemberPayload;
  body: IShoppingMallCart.ICreateFromWishlist;
}): Promise<IShoppingMallCart> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const member = props.member;
    const wishlistIds = await tx.shopping_mall_wishlists.findMany({
      where: {
        shopping_mall_member_id: member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    const wishlistItems = await tx.shopping_mall_wishlist_items.findMany({
      where: {
        shopping_mall_wishlist_id: { in: wishlistIds.map((x) => x.id) },
        deleted_at: null,
      },
      select: {
        shopping_mall_product_id: true,
      },
    });
    const existingCart = await tx.shopping_mall_carts.findFirst({
      where: {
        shopping_mall_member_id: member.id,
        deleted_at: null,
      },
      select: ShoppingMallCartTransformer.select().select,
    });
    const cart =
      existingCart ??
      (await tx.shopping_mall_carts.create({
        data: {
          id: v4() as unknown as string & tags.Format<"uuid">,
          shopping_mall_member_id: member.id,
          warning_inventory_insufficient: false,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        select: ShoppingMallCartTransformer.select().select,
      }));
    if (wishlistItems.length === 0) {
      const transformed = await ShoppingMallCartTransformer.transform(cart);
      return {
        ...transformed,
        items: [] as unknown as IShoppingMallCart["items"],
      };
    }
    const productIds = wishlistItems.map((x) => x.shopping_mall_product_id);
    const variants = await tx.shopping_mall_product_variants.findMany({
      where: {
        deleted_at: null,
        is_active: true,
        shopping_mall_product_id: { in: productIds },
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        price: true,
      },
    });
    const desiredLines = variants.map((v) => ({
      variantId: v.id,
      productId: v.shopping_mall_product_id,
      quantity: 1,
      subtotalAmount: v.price,
    }));
    const linesToAdd: Array<{
      variantId: string;
      quantity: number;
      subtotalAmount: number;
    }> = [];
    let warning = false;
    for (const line of desiredLines) {
      const latest = await tx.shopping_mall_inventory_records.findFirst({
        where: {
          shopping_mall_product_variant_id: line.variantId,
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        select: { available_quantity: true },
      });
      const available = latest?.available_quantity ?? 0;
      if (available < line.quantity) {
        warning = true;
        continue;
      }
      linesToAdd.push({
        variantId: line.variantId,
        quantity: line.quantity,
        subtotalAmount: line.subtotalAmount,
      });
    }
    if (linesToAdd.length > 0) {
      const variantIds = linesToAdd.map((l) => l.variantId);
      await tx.shopping_mall_cart_items.deleteMany({
        where: {
          shopping_mall_cart_id: cart.id,
          shopping_mall_product_variant_id: { in: variantIds },
          deleted_at: null,
        },
      });
      await tx.shopping_mall_cart_items.createMany({
        data: linesToAdd.map((l) => ({
          id: v4(),
          shopping_mall_cart_id: cart.id,
          shopping_mall_product_variant_id: l.variantId,
          quantity: l.quantity,
          subtotal_amount: l.subtotalAmount,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
    const finalCartRow = await tx.shopping_mall_carts.update({
      where: { id: cart.id },
      data: {
        warning_inventory_insufficient: warning,
        updated_at: new Date(),
      },
      select: ShoppingMallCartTransformer.select().select,
    });
    return await ShoppingMallCartTransformer.transform(finalCartRow);
  });
}
