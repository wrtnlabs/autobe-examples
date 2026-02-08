import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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

export async function putShoppingMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  const record =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
    });
  if (!record) {
    throw new HttpException("Cancellation request not found", 404);
  }
  if (record.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate seller_approval_status enum
  const allowedStatuses = ["pending", "approved", "rejected"];
  if (
    (props.body as any).seller_approval_status !== undefined &&
    !allowedStatuses.includes((props.body as any).seller_approval_status)
  ) {
    throw new HttpException(
      `Invalid seller_approval_status: ${(props.body as any).seller_approval_status}`,
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  const updateData: any = {
    updated_at: now,
  };
  if ("reason" in props.body && typeof props.body.reason === "string") {
    updateData.reason = props.body.reason;
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: updateData,
    });
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_order_item_id: updated.shopping_mall_order_item_id,
    reason: updated.reason ?? "",
    seller_approval_status: updated.seller_approval_status,
    seller_approval_reason: updated.seller_approval_reason ?? null,
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
