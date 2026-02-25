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

export async function getEcommerceCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCartItem> {
  // Verify cart belongs to customer
  const cart = await MyGlobal.prisma.ecommerce_shopping_carts.findUnique({
    where: {
      id: props.cartId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found or access denied", 404);
  }
  // Query cart item with detailed product information
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findUnique({
    where: {
      id: props.itemId,
      shopping_cart_id: props.cartId,
      deleted_at: null,
    },
    ...EcommerceCartItemTransformer.select(),
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  return await EcommerceCartItemTransformer.transform(cartItem);
}
