import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderIdCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderId, cancellationRequestId } = props;

  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: cancellationRequestId },
    });

  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }

  if (cancellationRequest.shopping_mall_order_id !== orderId) {
    throw new HttpException(
      "Cancellation request does not belong to the specified order",
      404,
    );
  }

  if (cancellationRequest.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You cannot delete this cancellation request",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_cancellation_requests.delete({
    where: { id: cancellationRequestId },
  });
}
