import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  // Verify the order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.body.shopping_mall_order_id },
  });

  if (order === null) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Current ISO datetime string for timestamps
  const now = toISOStringSafe(new Date());

  // Generate a new UUID
  const id = v4();

  // Create the refund request in the database
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: {
      id,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      refund_amount: props.body.refund_amount,
      refund_reason: props.body.refund_reason,
      refund_status: "pending",
      requested_at: now,
      processed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created refund request with proper ISO string conversion and null handling
  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_order_id: created.shopping_mall_order_id as string &
      tags.Format<"uuid">,
    refund_amount: created.refund_amount,
    refund_reason: created.refund_reason,
    refund_status: created.refund_status,
    requested_at: toISOStringSafe(created.requested_at),
    processed_at:
      created.processed_at !== null && created.processed_at !== undefined
        ? toISOStringSafe(created.processed_at)
        : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
