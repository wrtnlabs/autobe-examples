import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function putEcommerceMallCustomerCartsCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCartItem> {
  // Verify cart belongs to customer
  const cart = await MyGlobal.prisma.ecommerce_mall_shopping_carts.findUnique({
    where: {
      id: props.cartId,
      customer_id: props.customer.id,
    },
  });
  if (cart === null) {
    throw new HttpException("Cart not found or access denied", 404);
  }
  // Find cart item
  const cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      cart_id: props.cartId,
    },
  });
  if (cartItem === null) {
    throw new HttpException("Cart item not found", 404);
  }
  // Validate variant exists and is active
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: cartItem.variant_id,
        is_active: true,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found or inactive", 404);
  }
  // Validate quantity
  const requestedQuantity = props.body.quantity;
  if (requestedQuantity !== undefined) {
    if (requestedQuantity < 1) {
      throw new HttpException("Quantity must be at least 1", 400);
    }
    if (requestedQuantity > variant.stock_quantity) {
      throw new HttpException(
        "Requested quantity exceeds available stock",
        400,
      );
    }
  }
  // Update cart item
  const updatedItem = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    ...EcommerceMallCartItemTransformer.select(),
  });
  return EcommerceMallCartItemTransformer.transform(updatedItem);
}
