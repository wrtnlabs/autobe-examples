import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IShoppingMallCartItem> {
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: {
        id: props.cartItemId,
        customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        variant_id: true,
        variant: {
          select: {
            stock_quantity: true,
          },
        },
        variantSnapshot: {
          select: {
            sku_code: true,
            price: true,
          },
        },
        created_at: true,
      },
    });
  const availableStock = cartItem.variant.stock_quantity;
  if (props.body.quantity > availableStock) {
    throw new HttpException(`Out of stock. Available: ${availableStock}`, 409);
  }
  const newQuantity = props.body.quantity;
  if (newQuantity <= 0) {
    await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: cartItem.id },
      data: { deleted_at: toISOStringSafe(new Date()) },
    });
    // Return empty object per transformer's design
    return ShoppingMallCartItemTransformer.transform({
      id: cartItem.id,
      quantity: 0,
      unit_price: cartItem.unit_price,
      item_total: 0,
      created_at: toISOStringSafe(cartItem.created_at),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: toISOStringSafe(new Date()),
      variant: { stock_quantity: 0 },
      variantSnapshot: cartItem.variantSnapshot,
    } as any);
  }
  const updatedCartItem = await MyGlobal.prisma.shopping_mall_cart_items.update(
    {
      where: { id: cartItem.id },
      data: {
        quantity: newQuantity,
        item_total: newQuantity * cartItem.unit_price,
        updated_at: toISOStringSafe(new Date()),
      },
      select: ShoppingMallCartItemTransformer.select().select,
    },
  );
  return ShoppingMallCartItemTransformer.transform(updatedCartItem);
}
