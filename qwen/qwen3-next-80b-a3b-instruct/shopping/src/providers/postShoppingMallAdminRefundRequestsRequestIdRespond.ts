import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

export async function postShoppingMallAdminRefundRequestsRequestIdRespond(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IRespond;
}): Promise<void> {
  const request =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        status: true,
        order_item_id: true,
        customer_id: true,
        reason: true,
        responded_at: true,
      },
    });
  if (request.status !== "pending") {
    throw new HttpException("Refund request is no longer pending", 400);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  // Validate reason length for 'reject'
  if (props.body.action === "reject") {
    if (props.body.reason.length < 10 || props.body.reason.length > 500) {
      throw new HttpException(
        "Reason must be between 10 and 500 characters",
        400,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update refund request
    await prisma.shopping_mall_refund_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.action,
        responded_at: now,
        responder_id: props.admin.id,
        updated_at: now,
      },
    });
    // Get existing snapshot count for versioning
    const snapshotCount =
      await prisma.shopping_mall_refund_request_snapshots.count({
        where: { refund_request_id: props.requestId },
      });
    // Create snapshot
    await prisma.shopping_mall_refund_request_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        refund_request_id: props.requestId,
        version: snapshotCount + 1,
        reason: request.reason,
        status: props.body.action,
        responder_id: props.admin.id,
        response_reason:
          props.body.action === "approve" ? null : props.body.reason,
        changed_at: now,
        changed_by: "admin",
      },
    });
    // If approve: restore inventory
    if (props.body.action === "approve") {
      const orderItem =
        await prisma.shopping_mall_order_items.findUniqueOrThrow({
          where: { id: request.order_item_id },
          select: { shopping_mall_product_variant_id: true, quantity: true },
        });
      await prisma.shopping_mall_inventory_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          variant_id: orderItem.shopping_mall_product_variant_id,
          change_quantity: orderItem.quantity,
          reason: "refund",
          reference_id: props.requestId,
          created_at: now,
          updated_at: now,
        },
      });
    }
  });
}
