import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderNumberReturnsId(props: {
  admin: AdminPayload;
  orderNumber: string;
  id: string;
  body: IShoppingMallOrderReturn.IUpdate;
}): Promise<IShoppingMallOrderReturn> {
  // Find the return record
  const returnRecord =
    await MyGlobal.prisma.shopping_mall_order_returns.findUnique({
      where: {
        id: props.id,
        shopping_mall_order_id: props.orderNumber,
      },
    });

  if (!returnRecord) {
    throw new HttpException("Return not found", 404);
  }

  // Validate status transition rules
  const currentStatus = returnRecord.return_status;
  const newStatus = props.body.return_status;

  // Define valid transitions
  const validTransitions: Record<string, string[]> = {
    requested: ["approved", "denied"],
    approved: ["awaiting_return", "received", "refunded", "denied"],
    awaiting_return: ["received", "refunded"],
    received: ["refunded"],
    refunded: [],
    completed: [],
    denied: [],
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new HttpException(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      400,
    );
  }

  // Prepare update data
  const updateData: any = {
    return_status: newStatus,
    return_details: props.body.return_details,
    updated_at: toISOStringSafe(new Date()),
  };

  // Handle status-based timestamp updates without creating Date objects
  // We'll construct the ISO string directly
  if (newStatus === "approved" && !returnRecord.approved_at) {
    const now = toISOStringSafe(new Date());
    updateData.approved_at = now;
    updateData.approved_by_admin_id = props.admin.id;
  }

  if (newStatus === "received" && !returnRecord.received_at) {
    const now = toISOStringSafe(new Date());
    updateData.received_at = now;
  }

  if (newStatus === "refunded" && !returnRecord.refund_processed_at) {
    const now = toISOStringSafe(new Date());
    updateData.refund_processed_at = now;
  }

  // Update the return record
  const updatedReturn =
    await MyGlobal.prisma.shopping_mall_order_returns.update({
      where: { id: props.id },
      data: updateData,
    });

  // Return the return ID as a string as specified by IShoppingMallOrderReturn type
  return updatedReturn.id;
}
