import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerRefundsRefundRequestIdItemsItemId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the refund request item and its parent; validate both existence and ownership.
  const [refundRequest, refundItem] = await Promise.all([
    MyGlobal.prisma.shopping_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        shopping_actor_id: props.customer.id,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.shopping_refund_request_items.findFirst({
      where: {
        id: props.itemId,
        shopping_refund_request_id: props.refundRequestId,
      },
    }),
  ]);
  if (!refundRequest) {
    throw new HttpException("Refund request not found or access denied.", 404);
  }
  if (!refundItem) {
    throw new HttpException("Refund request item not found.", 404);
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Refund request is already processed or not deletable.",
      409,
    );
  }
  await MyGlobal.prisma.shopping_refund_request_items.delete({
    where: { id: props.itemId },
  });
}
