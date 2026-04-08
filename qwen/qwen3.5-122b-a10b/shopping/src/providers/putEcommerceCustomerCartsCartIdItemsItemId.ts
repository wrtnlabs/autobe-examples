import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartItemTransformer } from "../transformers/EcommerceCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceCartItem.IUpdate;
}): Promise<IEcommerceCartItem> {
  // 1. Validate cart exists and belongs to customer
  const cart = await MyGlobal.prisma.ecommerce_carts.findUnique({
    where: { id: props.cartId },
    select: { id: true, customer: { select: { id: true } } },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate cart item exists, belongs to cart, and is not soft-deleted
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      ecommerce_cart_id: true,
      ecommerce_product_variant_id: true,
      deleted_at: true,
      quantity: true,
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  if (cartItem.ecommerce_cart_id !== props.cartId) {
    throw new HttpException("Forbidden", 403);
  }
  if (cartItem.deleted_at !== null) {
    throw new HttpException("Cart item has been deleted", 400);
  }
  // 3. Validate product variant exists
  const productVariant =
    await MyGlobal.prisma.ecommerce_product_variants.findUnique({
      where: { id: cartItem.ecommerce_product_variant_id },
      select: { id: true },
    });
  if (!productVariant) {
    throw new HttpException("Product variant not found", 404);
  }
  // 4. Update the cart item or soft delete if quantity <= 0
  const quantity = props.body.quantity ?? cartItem.quantity;
  if (quantity <= 0) {
    // Soft delete the cart item
    await MyGlobal.prisma.ecommerce_cart_items.update({
      where: { id: props.itemId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  } else {
    // Update quantity
    await MyGlobal.prisma.ecommerce_cart_items.update({
      where: { id: props.itemId },
      data: {
        quantity: quantity,
        updated_at: new Date(),
      },
    });
  }
  // 5. Return transformed cart item
  const updated = await MyGlobal.prisma.ecommerce_cart_items.findUniqueOrThrow({
    where: { id: props.itemId },
    ...EcommerceCartItemTransformer.select(),
  });
  return await EcommerceCartItemTransformer.transform(updated);
}
