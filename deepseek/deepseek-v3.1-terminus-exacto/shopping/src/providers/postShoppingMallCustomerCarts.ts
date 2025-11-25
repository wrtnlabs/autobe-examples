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

export async function postShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.ICreate;
}): Promise<IShoppingMallCart> {
  // Validate that the customer session exists and belongs to the authenticated customer
  const customerSession =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: props.body.shopping_mall_customer_session_id,
        shopping_mall_customer_id: props.customer.id,
        expired_at: null,
      },
    });

  if (!customerSession) {
    throw new HttpException("Customer session not found or invalid", 404);
  }

  // Get current timestamp and calculate expiration (24 hours from now)
  const currentTimestamp = toISOStringSafe(new Date());
  const expiresAt = new Date(
    new Date(currentTimestamp).getTime() + 24 * 60 * 60 * 1000,
  );

  // Create the cart with proper UUID generation
  const cartId = v4();
  const cart = await MyGlobal.prisma.shopping_mall_carts.create({
    data: {
      id: cartId,
      shopping_mall_customer_session_id:
        props.body.shopping_mall_customer_session_id,
      status: "active",
      expires_at: expiresAt,
      applied_coupon_code: props.body.applied_coupon_code ?? null,
      shipping_method: props.body.shipping_method ?? null,
      estimated_shipping_cost: null,
      created_at: new Date(currentTimestamp),
      updated_at: new Date(currentTimestamp),
    },
  });

  // Return the cart with proper ISO string conversion
  return {
    id: cart.id as string & tags.Format<"uuid">,
    shopping_mall_customer_session_id:
      cart.shopping_mall_customer_session_id as string & tags.Format<"uuid">,
    status: cart.status,
    expires_at: toISOStringSafe(cart.expires_at),
    applied_coupon_code: cart.applied_coupon_code ?? undefined,
    shipping_method: cart.shipping_method ?? undefined,
    estimated_shipping_cost: cart.estimated_shipping_cost ?? undefined,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    deleted_at: cart.deleted_at ? toISOStringSafe(cart.deleted_at) : undefined,
  };
}
