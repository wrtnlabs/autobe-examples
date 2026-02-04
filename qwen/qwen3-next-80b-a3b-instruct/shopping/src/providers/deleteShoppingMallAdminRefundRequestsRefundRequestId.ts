import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify refund request exists
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // Prevent deletion if status is 'approved' or 'processed'
  if (
    refundRequest.status === "approved" ||
    refundRequest.status === "processed"
  ) {
    throw new HttpException(
      "Cannot delete approved or processed refund request",
      400,
    );
  }
  // Perform hard delete
  await MyGlobal.prisma.shopping_mall_refund_requests.delete({
    where: { id: props.refundRequestId },
  });
}
