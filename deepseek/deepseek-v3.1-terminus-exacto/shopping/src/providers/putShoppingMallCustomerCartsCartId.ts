import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  // Verify cart exists and belongs to customer
  const existingCart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_session_id: props.customer.session_id,
      deleted_at: null,
    },
  });

  if (!existingCart) {
    throw new HttpException("Cart not found or access denied", 404);
  }

  // Only allow updates to active carts
  if (existingCart.status !== "active") {
    throw new HttpException("Cannot update non-active cart", 400);
  }

  // Build update data with only allowed fields
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Map DTO fields to database fields with proper null/undefined handling
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  if (props.body.shipping_method !== undefined) {
    updateData.shipping_method =
      props.body.shipping_method === null ? null : props.body.shipping_method;
  }

  if (props.body.applied_coupon_code !== undefined) {
    updateData.applied_coupon_code =
      props.body.applied_coupon_code === null
        ? null
        : props.body.applied_coupon_code;
  }

  if (props.body.estimated_shipping_cost !== undefined) {
    updateData.estimated_shipping_cost = props.body.estimated_shipping_cost;
  }

  // Perform the update
  const updatedCart = await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: updateData,
  });

  // Return the updated cart with proper type conversion
  return {
    id: updatedCart.id,
    shopping_mall_customer_session_id:
      updatedCart.shopping_mall_customer_session_id,
    status: updatedCart.status,
    expires_at: toISOStringSafe(updatedCart.expires_at),
    applied_coupon_code:
      updatedCart.applied_coupon_code === null
        ? undefined
        : updatedCart.applied_coupon_code,
    shipping_method:
      updatedCart.shipping_method === null
        ? undefined
        : updatedCart.shipping_method,
    estimated_shipping_cost:
      updatedCart.estimated_shipping_cost === null
        ? undefined
        : updatedCart.estimated_shipping_cost,
    created_at: toISOStringSafe(updatedCart.created_at),
    updated_at: toISOStringSafe(updatedCart.updated_at),
    deleted_at: updatedCart.deleted_at
      ? toISOStringSafe(updatedCart.deleted_at)
      : undefined,
  };
}
