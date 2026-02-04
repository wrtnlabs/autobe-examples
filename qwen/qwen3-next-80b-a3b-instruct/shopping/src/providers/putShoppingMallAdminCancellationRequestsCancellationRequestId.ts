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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putShoppingMallAdminCancellationRequestsCancellationRequestId(props: {
  admin: AdminPayload;
  cancellationRequestId: string;
  body: IShoppingMallCancellationRequest.IResponse;
}): Promise<void> {
  // Find the cancellation request with required fields
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        order_item_id: true,
        status: true,
      },
    });
  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Check if request is already resolved
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Cancellation request is already resolved", 400);
  }
  // Update the request based on action
  if (props.body.action === "approve") {
    // Approve: update status and restock inventory
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "approved",
        responded_at: toISOStringSafe(new Date()),
        responded_by: props.admin.id,
      },
    });
    // Restock inventory using the selected fields
    // Create inventory record, assuming 'quantity' must be retrieved another way
    // Since 'quantity' is not available from findUnique, we need to find it differently
    const orderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findUnique({
        where: { id: cancellationRequest.order_item_id },
        select: { quantity: true, variant_id: true }, // Correct field name from schema
      });
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant_id: orderItem?.variant_id ?? "",
        type: "restock", // Fixed: replaced invalid 'change_type' with correct field 'type' based on schema
        source_transaction_id: cancellationRequest.id,
        actor_id: props.admin.id,
        created_at: toISOStringSafe(new Date()),
      },
    });
  } else if (props.body.action === "reject") {
    // Reject: update status with optional reason
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "rejected",
        responded_at: toISOStringSafe(new Date()),
        responded_by: props.admin.id,
        reason: props.body.reason === undefined ? undefined : props.body.reason,
      },
    });
  } else {
    throw new HttpException("Invalid action", 400);
  }
}
