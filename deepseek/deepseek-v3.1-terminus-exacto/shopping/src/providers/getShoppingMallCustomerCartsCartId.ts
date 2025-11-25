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

export async function getShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCart> {
  try {
    // Find the cart by ID
    const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
      where: { id: props.cartId },
    });

    if (!cart) {
      throw new HttpException("Shopping cart not found", 404);
    }

    // Verify the cart belongs to the authenticated customer's session
    if (cart.shopping_mall_customer_session_id !== props.customer.session_id) {
      throw new HttpException(
        "Access denied: Cart does not belong to your session",
        403,
      );
    }

    // Optional: Check if cart is expired (business logic decision)
    // If we want to exclude expired carts from being retrieved:
    // const now = new Date();
    // if (cart.expires_at < now && cart.status !== "converted") {
    //   throw new HttpException("Cart has expired", 410);
    // }

    // Return the cart data with proper date formatting
    return {
      id: cart.id,
      shopping_mall_customer_session_id: cart.shopping_mall_customer_session_id,
      status: cart.status,
      expires_at: toISOStringSafe(cart.expires_at),
      applied_coupon_code: cart.applied_coupon_code ?? undefined,
      shipping_method: cart.shipping_method ?? undefined,
      estimated_shipping_cost: cart.estimated_shipping_cost ?? undefined,
      created_at: toISOStringSafe(cart.created_at),
      updated_at: toISOStringSafe(cart.updated_at),
      deleted_at: cart.deleted_at
        ? toISOStringSafe(cart.deleted_at)
        : undefined,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    // Log the error for production monitoring
    console.error(`Error retrieving cart ${props.cartId}:`, error);
    throw new HttpException("Internal server error", 500);
  }
}
