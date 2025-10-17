import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const { customer, cartId, body } = props;

  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: cartId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException(
      "Unauthorized: Cart not found or does not belong to you",
      403,
    );
  }

  if (body.quantity < 1) {
    throw new HttpException("Quantity must be at least 1", 400);
  }

  if (body.quantity > 99) {
    throw new HttpException("Maximum quantity per item is 99", 400);
  }

  const sku = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      id: body.shopping_mall_sku_id,
      is_active: true,
    },
    include: {
      product: {
        include: {
          seller: true,
        },
      },
    },
  });

  if (!sku) {
    throw new HttpException(
      "Product variant not found or is not available",
      404,
    );
  }

  if (sku.product.status !== "active" || sku.product.deleted_at !== null) {
    throw new HttpException("Product is not available for purchase", 400);
  }

  if (
    sku.product.seller.account_status !== "active" ||
    sku.product.seller.deleted_at !== null
  ) {
    throw new HttpException(
      "This product is from an inactive seller and cannot be purchased",
      400,
    );
  }

  if (sku.available_quantity < body.quantity) {
    throw new HttpException(
      `Insufficient inventory. Only ${sku.available_quantity} units available`,
      400,
    );
  }

  const existingCartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
      where: {
        shopping_mall_cart_id: cartId,
        shopping_mall_sku_id: body.shopping_mall_sku_id,
      },
    });

  if (existingCartItem) {
    const newQuantity = existingCartItem.quantity + body.quantity;

    if (newQuantity > 99) {
      throw new HttpException(
        `Adding ${body.quantity} units would exceed the maximum of 99 per item. Current cart has ${existingCartItem.quantity} units`,
        400,
      );
    }

    if (sku.available_quantity < body.quantity) {
      throw new HttpException(
        `Cannot add ${body.quantity} more units. Only ${sku.available_quantity} units available`,
        400,
      );
    }

    const now = toISOStringSafe(new Date());

    const [updatedCartItem] = await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.shopping_mall_cart_items.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: newQuantity,
          unit_price: sku.price,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.shopping_mall_skus.update({
        where: { id: body.shopping_mall_sku_id },
        data: {
          reserved_quantity: sku.reserved_quantity + body.quantity,
        },
      }),
    ]);

    await MyGlobal.prisma.shopping_mall_carts.update({
      where: { id: cartId },
      data: {
        updated_at: now,
      },
    });

    return {
      id: updatedCartItem.id,
      quantity: updatedCartItem.quantity,
    };
  }

  const currentCartItemCount =
    await MyGlobal.prisma.shopping_mall_cart_items.count({
      where: {
        shopping_mall_cart_id: cartId,
      },
    });

  if (currentCartItemCount >= 100) {
    throw new HttpException(
      "Cart cannot contain more than 100 different products",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const cartItemId = v4() as string & tags.Format<"uuid">;

  const [createdCartItem] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_cart_items.create({
      data: {
        id: cartItemId,
        shopping_mall_cart_id: cartId,
        shopping_mall_sku_id: body.shopping_mall_sku_id,
        quantity: body.quantity,
        unit_price: sku.price,
        created_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.shopping_mall_skus.update({
      where: { id: body.shopping_mall_sku_id },
      data: {
        reserved_quantity: sku.reserved_quantity + body.quantity,
      },
    }),
  ]);

  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: cartId },
    data: {
      updated_at: now,
    },
  });

  return {
    id: createdCartItem.id,
    quantity: createdCartItem.quantity,
  };
}
