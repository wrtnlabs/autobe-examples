import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function putShoppingMallBuyerBuyersMeCartItemsCartItemId(props: {
  buyer: BuyerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const existingCartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
      where: { id: props.cartItemId },
    });

  if (!existingCartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  if (existingCartItem.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException(
      "Forbidden: This cart item does not belong to you",
      403,
    );
  }

  if (existingCartItem.deleted_at !== null) {
    throw new HttpException("Cart item has been deleted", 404);
  }

  const inventoryStock =
    await MyGlobal.prisma.shopping_mall_inventory_stocks.findUnique({
      where: {
        shopping_mall_sale_sku_id: existingCartItem.shopping_mall_sale_sku_id,
      },
    });

  if (!inventoryStock) {
    throw new HttpException(
      "Inventory information not found for this product",
      404,
    );
  }

  if (props.body.quantity > inventoryStock.available_quantity) {
    throw new HttpException(
      `Insufficient inventory. Requested: ${props.body.quantity}, Available: ${inventoryStock.available_quantity}`,
      400,
    );
  }

  const updatedCartItem = await MyGlobal.prisma.shopping_mall_cart_items.update(
    {
      where: { id: props.cartItemId },
      data: {
        quantity: props.body.quantity,
        updated_at: new Date(),
      },
    },
  );

  return {
    id: updatedCartItem.id,
    shopping_mall_buyer_id: updatedCartItem.shopping_mall_buyer_id,
    shopping_mall_sale_sku_id: updatedCartItem.shopping_mall_sale_sku_id,
    quantity: updatedCartItem.quantity,
    unit_price_snapshot: updatedCartItem.unit_price_snapshot,
    created_at: toISOStringSafe(updatedCartItem.created_at),
    updated_at: toISOStringSafe(updatedCartItem.updated_at),
    deleted_at:
      updatedCartItem.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedCartItem.deleted_at),
  };
}
