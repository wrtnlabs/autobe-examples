import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderIdRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderId, refundRequestId } = props;

  // Find refund request to verify existence and ownership
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: {
        id: refundRequestId,
      },
    });

  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }

  if (refundRequest.shopping_mall_order_id !== orderId) {
    throw new HttpException(
      "Refund request does not belong to specified order",
      404,
    );
  }

  if (refundRequest.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You do not own this refund request",
      403,
    );
  }

  // Delete refund request permanently
  await MyGlobal.prisma.shopping_mall_refund_requests.delete({
    where: {
      id: refundRequestId,
    },
  });
}
