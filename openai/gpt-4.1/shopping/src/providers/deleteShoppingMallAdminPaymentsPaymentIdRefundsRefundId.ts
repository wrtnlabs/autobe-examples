import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminPaymentsPaymentIdRefundsRefundId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<void> {
  const refund = await MyGlobal.prisma.shopping_mall_payment_refunds.findUnique(
    {
      where: { id: props.refundId },
    },
  );

  if (!refund || refund.payment_id !== props.paymentId) {
    throw new HttpException(
      "Refund not found or does not belong to the specified payment.",
      404,
    );
  }

  if (refund.deleted_at !== null) {
    throw new HttpException("This refund has already been deleted.", 400);
  }

  await MyGlobal.prisma.shopping_mall_payment_refunds.update({
    where: { id: props.refundId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
