import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, refundRequestId } = props;

  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: refundRequestId },
    });

  if (
    refundRequest === null ||
    refundRequest.shopping_mall_order_id !== orderId
  ) {
    throw new HttpException("Refund request not found", 404);
  }

  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: admin.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (adminRecord === null) {
    throw new HttpException("Unauthorized: admin not active or not found", 403);
  }

  await MyGlobal.prisma.shopping_mall_refund_requests.delete({
    where: { id: refundRequestId },
  });
}
