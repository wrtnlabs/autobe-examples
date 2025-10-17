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

export async function putShoppingMallCustomerOrdersOrderIdRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<void> {
  const { customer, orderId, refundRequestId, body } = props;

  const existing =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        id: refundRequestId,
        shopping_mall_order_id: orderId,
      },
    });

  if (!existing) {
    throw new HttpException("Refund request not found", 404);
  }

  if (existing.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: Not the owner of the refund request",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: refundRequestId },
    data: {
      reason: body.reason,
      refund_amount: body.refund_amount,
      status: body.status,
      requested_at:
        body.requested_at === null || body.requested_at === undefined
          ? undefined
          : typeof body.requested_at === "string"
            ? body.requested_at
            : toISOStringSafe(body.requested_at),
      processed_at:
        body.processed_at === null || body.processed_at === undefined
          ? undefined
          : typeof body.processed_at === "string"
            ? body.processed_at
            : toISOStringSafe(body.processed_at),
    },
  });
}
