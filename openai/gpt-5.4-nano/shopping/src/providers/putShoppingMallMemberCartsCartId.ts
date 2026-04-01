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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberCartsCartId(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCart.IUpdate;
}): Promise<IShoppingMallCart> {
  void props.body;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const cart = await tx.shopping_mall_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        shopping_mall_member_id: true,
        warning_inventory_insufficient: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    if (cart.shopping_mall_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    const cartItems = await tx.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      select: {
        shopping_mall_product_variant_id: true,
        quantity: true,
      },
    });
    let warningInventoryInsufficient = false;
    for (const item of cartItems) {
      const latestInventory =
        await tx.shopping_mall_inventory_records.findFirst({
          where: {
            shopping_mall_product_variant_id:
              item.shopping_mall_product_variant_id,
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
          select: { available_quantity: true },
        });
      const availableQuantity = latestInventory?.available_quantity ?? 0;
      if (item.quantity > availableQuantity) {
        warningInventoryInsufficient = true;
        break;
      }
    }
    await tx.shopping_mall_carts.update({
      where: { id: props.cartId },
      data: {
        warning_inventory_insufficient: warningInventoryInsufficient,
        updated_at: new Date(),
      },
    });
    const updated = await tx.shopping_mall_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        shopping_mall_member_id: true,
        warning_inventory_insufficient: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return {
      id: updated.id,
      shopping_mall_member_id: updated.shopping_mall_member_id,
      warning_inventory_insufficient: updated.warning_inventory_insufficient,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
      deleted_at: updated.deleted_at?.toISOString() ?? null,
      items: null,
    } satisfies IShoppingMallCart;
  });
}
