import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the refund request (will throw 404 if not found)
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: { status: true },
    });
  // Check if status is pending - only pending requests can be deleted
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Refund request has already been responded to",
      400,
    );
  }
  // Delete the refund request
  await MyGlobal.prisma.shopping_mall_refund_requests.delete({
    where: { id: props.refundRequestId },
  });
}
