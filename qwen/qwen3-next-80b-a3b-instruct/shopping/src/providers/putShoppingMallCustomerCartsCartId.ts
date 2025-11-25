import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCart.IUpdate;
}): Promise<IShoppingMallCart> {
  // Validate input: body must be 'checked_out' (only allowed transition)
  if (props.body !== "checked_out") {
    throw new HttpException(
      'Only status transition to "checked_out" is allowed',
      400,
    );
  }

  // Find cart by ID and ensure it belongs to the authenticated customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  // If cart not found or doesn't belong to customer, return 404
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }

  // Only transition from 'active' to 'checked_out' is allowed
  if (cart.status !== "active") {
    throw new HttpException(
      "Cart cannot be checked out: cart is not in active state",
      400,
    );
  }

  // Get current timestamp as ISO string without creating Date object
  const now = toISOStringSafe(new Date());

  // Update cart status to 'checked_out' and set updated_at
  const updatedCart = await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: {
      status: "checked_out",
      updated_at: now,
    },
  });

  // Return formatted response using toISOStringSafe and string timestamp
  return {
    status: typia.assert<"active" | "expired" | "checked_out">(
      updatedCart.status,
    ),
    expires_at: toISOStringSafe(updatedCart.expires_at),
  };
}
