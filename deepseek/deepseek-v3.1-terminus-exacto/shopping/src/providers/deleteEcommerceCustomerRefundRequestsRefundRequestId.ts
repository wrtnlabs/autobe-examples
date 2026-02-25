import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceCustomerRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the refund request exists and belongs to the customer
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        ecommerce_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found or access denied", 404);
  }
  // Check if the refund request is still within the valid processing window
  // Based on requirements, refund requests can only be deleted if still pending
  // We need to check if there are any seller responses
  const existingResponse =
    await MyGlobal.prisma.ecommerce_refund_response_records.findFirst({
      where: {
        ecommerce_refund_request_id: props.refundRequestId,
      },
    });
  if (existingResponse !== null) {
    throw new HttpException(
      "Cannot delete refund request that already has seller response",
      400,
    );
  }
  // Check if refund window has expired
  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(refundRequest.refund_window_expires_at);
  if (expiresAt < now) {
    throw new HttpException(
      "Refund window has expired, cannot delete request",
      400,
    );
  }
  // Perform soft deletion
  await MyGlobal.prisma.ecommerce_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
