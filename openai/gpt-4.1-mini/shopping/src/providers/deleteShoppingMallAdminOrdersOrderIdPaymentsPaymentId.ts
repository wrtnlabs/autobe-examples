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
  const { admin, orderId, paymentId } = props;

  // Authorization check: verify admin exists, active and not soft-deleted
  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: admin.id,
      status: "active",
      deleted_at: null,
    },
  });

  if (!adminRecord) {
    throw new HttpException("Unauthorized: Admin not active or not found", 403);
  }

  // Verify payment exists and belongs to given order
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirstOrThrow(
    {
      where: {
        id: paymentId,
        shopping_mall_order_id: orderId,
      },
    },
  );

  // Delete the payment record by id
  await MyGlobal.prisma.shopping_mall_payments.delete({
    where: {
      id: payment.id,
    },
  });
}
