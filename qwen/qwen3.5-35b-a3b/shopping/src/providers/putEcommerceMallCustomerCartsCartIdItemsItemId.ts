import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCartItem> {
  // Verify cart belongs to authenticated customer
  const cart =
    await MyGlobal.prisma.ecommerce_mall_shopping_carts.findUniqueOrThrow({
      where: {
        id: props.cartId,
        customer_id: props.customer.id,
      },
      select: {
        id: true,
        customer_id: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Fetch cart item and verify it exists in the cart and is not soft-deleted
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        cart_id: cart.id,
        deleted_at: null,
      },
      select: {
        id: true,
        cart_id: true,
        variant_id: true,
        quantity: true,
        price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Fetch variant to check stock and active status
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: cartItem.variant_id },
      select: {
        id: true,
        is_active: true,
        stock_quantity: true,
      },
    });
  if (!variant.is_active) {
    throw new HttpException("Variant is no longer active", 409);
  }
  // Validate quantity if provided
  if (props.body.quantity !== undefined) {
    if (props.body.quantity < 1) {
      throw new HttpException("Quantity must be at least 1", 400);
    }
    if (props.body.quantity > cartItem.quantity) {
      if (props.body.quantity > variant.stock_quantity) {
        throw new HttpException("Insufficient stock available", 409);
      }
    }
  }
  // Update cart item with new quantity if provided
  const updated = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.itemId },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      updated_at: new Date(),
    },
    ...EcommerceMallCartItemTransformer.select(),
  });
  return EcommerceMallCartItemTransformer.transform(updated);
}
