import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdPaymentsPaymentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the payment exists and belongs to the specified order
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirst({
    where: {
      id: props.paymentId,
      shopping_mall_order_id: props.orderId,
    },
  });

  if (!payment) {
    throw new HttpException(
      "Payment not found or does not belong to the specified order",
      404,
    );
  }

  // Perform hard delete of the payment record
  await MyGlobal.prisma.shopping_mall_payments.delete({
    where: {
      id: props.paymentId,
    },
  });
}
