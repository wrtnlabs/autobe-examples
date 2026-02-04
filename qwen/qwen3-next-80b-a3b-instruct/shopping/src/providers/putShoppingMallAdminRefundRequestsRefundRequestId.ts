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
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  // Validate refund request exists
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // Check if refund request is already closed
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request already closed", 409);
  }
  // Initialize status and message variables
  let status: "approved" | "rejected" = "approved";
  let message: string = "";
  // Only update the refund request status and reason - do not create inventory records
  // The schema does not have product_id or order_item_id in shopping_mall_inventory_records for this context
  if (props.body.status === "approve") {
    status = "approved";
    message = "Refund approved and inventory restored.";
    // Update refund request with approved status
    await MyGlobal.prisma.shopping_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: "approved",
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } else if (props.body.status === "reject") {
    status = "rejected";
    message = "Refund request rejected.";
    // Update refund request with rejected status and reason
    await MyGlobal.prisma.shopping_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: "rejected",
        reason: props.body.reason ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Return exactly what IShoppingMallRefundRequest requires
  return {
    status,
    message,
  };
}
