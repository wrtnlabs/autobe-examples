import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderNumberReturns(props: {
  customer: CustomerPayload;
  orderNumber: string;
  body: IShoppingMallOrderReturn.ICreate;
}): Promise<IShoppingMallOrderReturn> {
  // Find the order by order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  // Validate order exists and belongs to customer
  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Validate order is in state that allows returns (paid, delivered, completed)
  if (!["paid", "delivered", "completed"].includes(order.status)) {
    throw new HttpException(
      "Returns are not allowed for this order status",
      400,
    );
  }

  // Check if return already exists for this order
  const existingReturn =
    await MyGlobal.prisma.shopping_mall_order_returns.findFirst({
      where: {
        shopping_mall_order_id: order.id,
      },
    });

  if (existingReturn) {
    throw new HttpException("Return already requested for this order", 409);
  }

  // Create new return request with generated UUID for id
  const newReturn = await MyGlobal.prisma.shopping_mall_order_returns.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: order.id,
      return_reason: "wrong_item",
      return_details: null,
      return_status: "requested",
      refund_amount: 0,
      return_method: "mail_return",
      return_tracking_number: null,
      return_tracking_url: null,
      approved_by_admin_id: null,
      approved_at: null,
      received_at: null,
      refund_processed_at: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Since IShoppingMallOrderReturn is defined as a string in the DTO, return the ID
  return newReturn.id;
}
