import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdRefundRequests(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const { customer, orderId, body } = props;

  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: { shopping_mall_order_id: orderId },
    });

  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }

  if (refundRequest.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: Not your refund request", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: refundRequest.id },
    data: {
      shopping_mall_order_id:
        body.shopping_mall_order_id satisfies string as string,
      shopping_mall_customer_id:
        body.shopping_mall_customer_id satisfies string as string,
      reason: body.reason,
      refund_amount: body.refund_amount,
      status: body.status,
      requested_at:
        body.requested_at === null || body.requested_at === undefined
          ? undefined
          : toISOStringSafe(body.requested_at),
      processed_at:
        body.processed_at === null || body.processed_at === undefined
          ? undefined
          : toISOStringSafe(body.processed_at),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  const validStatus = typia.assert<"Pending" | "Approved" | "Rejected">(
    updated.status,
  );

  return {
    id: updated.id as string & tags.Format<"uuid">,
    shopping_mall_order_id: updated.shopping_mall_order_id as string &
      tags.Format<"uuid">,
    shopping_mall_customer_id: updated.shopping_mall_customer_id as string &
      tags.Format<"uuid">,
    reason: updated.reason,
    refund_amount: updated.refund_amount,
    status: validStatus,
    requested_at:
      updated.requested_at === null || updated.requested_at === undefined
        ? (() => {
            throw new HttpException(
              "Invalid state: requested_at is missing",
              500,
            );
          })()
        : toISOStringSafe(updated.requested_at),
    processed_at:
      updated.processed_at === null
        ? null
        : updated.processed_at === undefined
          ? undefined
          : toISOStringSafe(updated.processed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
