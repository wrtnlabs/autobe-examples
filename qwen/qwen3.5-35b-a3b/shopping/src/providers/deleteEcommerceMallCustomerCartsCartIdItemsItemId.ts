import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Validate cart exists and belongs to the customer
  await MyGlobal.prisma.ecommerce_mall_shopping_carts.findUniqueOrThrow({
    where: {
      id: props.cartId,
      customer_id: props.customer.id,
    },
  });
  // Step 2: Validate cart item exists and belongs to the cart
  await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
    where: {
      id: props.itemId,
      cart_id: props.cartId,
    },
  });
  // Step 3: Delete the cart item
  await MyGlobal.prisma.ecommerce_mall_cart_items.delete({
    where: {
      id: props.itemId,
    },
  });
  // Step 4: Update cart timestamp
  await MyGlobal.prisma.ecommerce_mall_shopping_carts.update({
    where: {
      id: props.cartId,
    },
    data: {
      updated_at: new Date(),
    },
  });
}
