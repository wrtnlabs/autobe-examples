import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
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

export async function getEcommerceCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCartItem> {
  const cart = await MyGlobal.prisma.ecommerce_carts.findUnique({
    where: { id: props.cartId },
    select: { id: true, ecommerce_customer_id: true },
  });
  if (!cart || cart.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Cart not found or does not belong to you", 404);
  }
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findUnique({
    where: {
      id: props.itemId,
      ecommerce_carts_id: props.cartId,
    },
    ...EcommerceCartItemTransformer.select(),
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  return EcommerceCartItemTransformer.transform(cartItem);
}
