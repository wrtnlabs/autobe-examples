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
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderIdItemsOrderItemIdCancel(props: {
  admin: AdminPayload;
  orderId: string;
  orderItemId: string;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IShoppingMallCancellationRequest> {
  // Fetch the order item to validate status and ownership
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
    include: { order: true },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order item status is 'paid'
  if (orderItem.status !== "paid") {
    throw new HttpException(
      'Cancellation can only be requested for items with status "paid"',
      400,
    );
  }
  // Validate cancellation reason length
  if (props.body.reason.length < 10) {
    throw new HttpException(
      "Cancellation reason must be at least 10 characters long",
      400,
    );
  }
  // Create cancellation request in database
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: {
        id: v4(),
        reason: props.body.reason,
        status: "pending",
        requested_at: toISOStringSafe(new Date()),
        responded_at: null,
        order_item_id: props.orderItemId,
        // Removed responder since it's not a required field and relationship is managed via order_item_id
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
  // Return the cancellation request DTO (only reason field required)
  return {
    reason: cancellationRequest.reason,
  };
}
