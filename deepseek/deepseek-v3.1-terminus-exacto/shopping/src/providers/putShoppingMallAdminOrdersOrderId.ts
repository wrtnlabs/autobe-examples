import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  // Check if any update fields are provided
  const hasUpdates =
    props.body.status !== undefined ||
    props.body.shipping_address !== undefined ||
    props.body.billing_address !== undefined;

  if (!hasUpdates) {
    throw new HttpException("No valid update fields provided", 400);
  }

  // Verify the order exists
  const existingOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    include: {
      customer: true,
      customerSession: true,
    },
  });

  if (!existingOrder) {
    throw new HttpException("Order not found", 404);
  }

  // Update the order with provided fields
  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.shipping_address !== undefined && {
        shipping_address: props.body.shipping_address,
      }),
      ...(props.body.billing_address !== undefined && {
        billing_address: props.body.billing_address,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      customer: true,
      customerSession: true,
    },
  });

  // Convert to API response format
  return {
    id: updated.id,
    order_number: updated.order_number,
    total_amount: updated.total_amount,
    subtotal_amount: updated.subtotal_amount,
    tax_amount: updated.tax_amount,
    shipping_amount: updated.shipping_amount,
    currency: updated.currency,
    status: updated.status,
    shipping_address: updated.shipping_address,
    billing_address: updated.billing_address,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    customer: {
      id: updated.customer.id,
      email: updated.customer.email,
      first_name: updated.customer.first_name,
      last_name: updated.customer.last_name,
      phone_number: updated.customer.phone_number ?? undefined,
      status: updated.customer.status,
      created_at: toISOStringSafe(updated.customer.created_at),
      updated_at: updated.customer.updated_at
        ? toISOStringSafe(updated.customer.updated_at)
        : undefined,
    },
    customerSession: {
      id: updated.customerSession.id,
      created_at: toISOStringSafe(updated.customerSession.created_at),
    },
  };
}
