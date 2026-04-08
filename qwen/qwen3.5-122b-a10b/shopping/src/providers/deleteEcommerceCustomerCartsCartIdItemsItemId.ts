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

export async function deleteEcommerceCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify cart exists and belongs to the authenticated customer
  const cart = await MyGlobal.prisma.ecommerce_carts.findUniqueOrThrow({
    where: {
      id: props.cartId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_customer_id: true,
    },
  });
  // Step 2: Verify cart ownership (403 if not owned by customer)
  if (cart.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify cart item exists within the specified cart
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findUniqueOrThrow(
    {
      where: {
        id: props.itemId,
      },
      select: {
        id: true,
        ecommerce_cart_id: true,
        deleted_at: true,
      },
    },
  );
  // Step 4: Verify cart item belongs to the specified cart
  if (cartItem.ecommerce_cart_id !== props.cartId) {
    throw new HttpException("Not Found", 404);
  }
  // Step 5: Verify cart item is not already soft-deleted (400 if already deleted)
  if (cartItem.deleted_at !== null) {
    throw new HttpException("Cart item already deleted", 400);
  }
  // Step 6: Soft delete the cart item by setting deleted_at
  await MyGlobal.prisma.ecommerce_cart_items.update({
    where: {
      id: props.itemId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
