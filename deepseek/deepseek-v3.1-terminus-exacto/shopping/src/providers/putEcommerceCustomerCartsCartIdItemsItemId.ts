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
  // Validate cart belongs to customer
  const cart = await MyGlobal.prisma.ecommerce_shopping_carts.findFirst({
    where: {
      id: props.cartId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found or access denied", 404);
  }
  // Find the cart item and validate it exists in this cart
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findFirst({
    where: {
      id: props.itemId,
      shopping_cart_id: props.cartId,
      deleted_at: null,
    },
    include: {
      productVariant: {
        include: {
          product: true,
        },
      },
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  // Check stock availability
  if (props.body.quantity > cartItem.productVariant.quantity) {
    throw new HttpException("Requested quantity exceeds available stock", 400);
  }
  // Update cart item quantity
  const updatedCartItem = await MyGlobal.prisma.ecommerce_cart_items.update({
    where: { id: props.itemId },
    data: {
      quantity: props.body.quantity,
      updated_at: new Date().toISOString(),
    },
    ...EcommerceCartItemTransformer.select(),
  });
  return await EcommerceCartItemTransformer.transform(updatedCartItem);
}
